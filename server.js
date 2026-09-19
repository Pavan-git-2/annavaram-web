require("dotenv").config();

const express = require("express");
const path = require("path");
const multer = require("multer");
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================================
// ENVIRONMENT VARIABLES
// =====================================================

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET_NAME = "media";

// =====================================================
// CHECK REQUIRED ENV VARIABLES
// =====================================================

if (!SUPABASE_URL) {
    console.error("ERROR: SUPABASE_URL is missing");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
        "ERROR: SUPABASE_SERVICE_ROLE_KEY is missing"
    );
}

// =====================================================
// SUPABASE CLIENT
// =====================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);

// =====================================================
// POSTGRES DATABASE
// =====================================================

const pool = new Pool({
    user: process.env.DB_USER || "postgres",

    host:
        process.env.DB_HOST ||
        "localhost",

    database:
        process.env.DB_NAME ||
        "annavaram_web",

    password:
        process.env.DB_PASSWORD,

    port:
        process.env.DB_PORT ||
        5432,

    ssl:
        process.env.NODE_ENV === "production"
            ? {
                  rejectUnauthorized: false
              }
            : false
});

// =====================================================
// EXPRESS MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// =====================================================
// STATIC PUBLIC FILES
// =====================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);

// =====================================================
// MULTER
// STORE FILE IN MEMORY
// =====================================================

const upload = multer({

    storage:
        multer.memoryStorage(),

    limits: {

        fileSize:
            1024 * 1024 * 1024
    },

    fileFilter:
        (req, file, cb) => {

            if (
                file.mimetype.startsWith(
                    "image/"
                ) ||
                file.mimetype.startsWith(
                    "video/"
                )
            ) {

                cb(null, true);

            } else {

                cb(
                    new Error(
                        "Only image and video files are allowed"
                    )
                );

            }

        }

});

// =====================================================
// ADMIN LOGIN
// =====================================================

app.post(
    "/api/login",
    (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email and password are required"

                });

            }

            if (
                email === ADMIN_EMAIL &&
                password === ADMIN_PASSWORD
            ) {

                return res.json({

                    success: true,

                    message:
                        "Login successful"

                });

            }

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        } catch (error) {

            console.error(
                "Login error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Login failed"

            });

        }

    }
);

// =====================================================
// HOME PAGE
// =====================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);

// =====================================================
// GET ALL CONTENT
// =====================================================

app.get(
    "/api/content",
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        type,
                        title,
                        filename,
                        url,
                        category
                    FROM content
                    ORDER BY id DESC
                    `
                );

            return res.json({

                success: true,

                data:
                    result.rows

            });

        } catch (error) {

            console.error(
                "Get content error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load content"

            });

        }

    }
);

// =====================================================
// UPLOAD IMAGE / VIDEO
// =====================================================

app.post(
    "/api/upload",
    upload.single("file"),
    async (req, res) => {

        try {

            // -------------------------------------------------
            // CHECK FILE
            // -------------------------------------------------

            if (!req.file) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please select a file"

                });

            }

            // -------------------------------------------------
            // DETERMINE TYPE
            // -------------------------------------------------

            const type =
                req.file.mimetype.startsWith(
                    "image/"
                )
                    ? "image"
                    : "video";

            // -------------------------------------------------
            // TITLE
            // -------------------------------------------------

            const title =
                req.body.title ||
                req.file.originalname;

            // -------------------------------------------------
            // CATEGORY
            // -------------------------------------------------

            const category =
                req.body.category ||
                "latest";

            // -------------------------------------------------
            // FILE EXTENSION
            // -------------------------------------------------

            const extension =
                path.extname(
                    req.file.originalname
                );

            // -------------------------------------------------
            // SAFE FILE NAME
            // -------------------------------------------------

            const originalName =
                path.basename(
                    req.file.originalname,
                    extension
                );

            const safeName =
                originalName
                    .replace(
                        /[^a-zA-Z0-9-_]/g,
                        "-"
                    )
                    .replace(
                        /-+/g,
                        "-"
                    );

            // -------------------------------------------------
            // UNIQUE FILE NAME
            // -------------------------------------------------

            const fileName =
                `${Date.now()}-${safeName}${extension}`;

            // -------------------------------------------------
            // STORAGE FOLDER
            // -------------------------------------------------

            const folder =
                type === "image"
                    ? "images"
                    : "videos";

            const storagePath =
                `${folder}/${fileName}`;

            console.log(
                "Uploading:",
                storagePath
            );

            // -------------------------------------------------
            // SUPABASE STORAGE UPLOAD
            // -------------------------------------------------

            const {
                error:
                    uploadError
            } =
                await supabase.storage
                    .from(
                        BUCKET_NAME
                    )
                    .upload(
                        storagePath,
                        req.file.buffer,
                        {
                            contentType:
                                req.file.mimetype,

                            cacheControl:
                                "3600",

                            upsert:
                                false
                        }
                    );

            if (uploadError) {

                console.error(
                    "Supabase upload error:",
                    uploadError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Failed to upload file to Supabase Storage",

                    error:
                        uploadError.message

                });

            }

            // -------------------------------------------------
            // GET PUBLIC URL
            // -------------------------------------------------

            const {
                data:
                    publicUrlData
            } =
                supabase.storage
                    .from(
                        BUCKET_NAME
                    )
                    .getPublicUrl(
                        storagePath
                    );

            const publicUrl =
                publicUrlData.publicUrl;

            console.log(
                "Public URL:",
                publicUrl
            );

            // -------------------------------------------------
            // SAVE CONTENT IN DATABASE
            // -------------------------------------------------

            const result =
                await pool.query(
                    `
                    INSERT INTO content
                    (
                        type,
                        title,
                        filename,
                        url,
                        category
                    )
                    VALUES
                    (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5
                    )
                    RETURNING *
                    `,
                    [
                        type,
                        title,
                        storagePath,
                        publicUrl,
                        category
                    ]
                );

            const content =
                result.rows[0];

            // -------------------------------------------------
            // RESPONSE
            // -------------------------------------------------

            return res.json({

                success: true,

                message:
                    "File uploaded successfully",

                id:
                    content.id,

                type:
                    content.type,

                title:
                    content.title,

                filename:
                    content.filename,

                url:
                    content.url,

                category:
                    content.category

            });

        } catch (error) {

            console.error(
                "Upload error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Upload failed",

                error:
                    error.message

            });

        }

    }
);

// =====================================================
// EDIT CONTENT TITLE
// =====================================================

app.put(
    "/api/content/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                title
            } = req.body;

            if (
                !title ||
                !title.trim()
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Title is required"

                });

            }

            const result =
                await pool.query(
                    `
                    UPDATE content
                    SET title = $1
                    WHERE id = $2
                    RETURNING *
                    `,
                    [
                        title.trim(),
                        id
                    ]
                );

            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Content not found"

                });

            }

            return res.json({

                success: true,

                message:
                    "Content updated successfully",

                data:
                    result.rows[0]

            });

        } catch (error) {

            console.error(
                "Edit error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update content"

            });

        }

    }
);

// =====================================================
// DELETE CONTENT
// =====================================================

app.delete(
    "/api/content/:id",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            // -------------------------------------------------
            // GET CONTENT
            // -------------------------------------------------

            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM content
                    WHERE id = $1
                    `,
                    [id]
                );

            if (
                result.rows.length === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Content not found"

                });

            }

            const content =
                result.rows[0];

            // -------------------------------------------------
            // DELETE FROM SUPABASE STORAGE
            // -------------------------------------------------

            if (
                content.filename
            ) {

                let storagePath =
                    content.filename;

                /*
                 * New records contain:
                 * images/file.jpg
                 * videos/file.mp4
                 *
                 * Old records may contain:
                 * /uploads/images/file.jpg
                 */

                if (
                    storagePath.startsWith(
                        "/uploads/"
                    )
                ) {

                    storagePath =
                        storagePath.replace(
                            "/uploads/",
                            ""
                        );

                }

                if (
                    !storagePath.startsWith(
                        "images/"
                    ) &&
                    !storagePath.startsWith(
                        "videos/"
                    )
                ) {

                    storagePath =
                        content.type === "image"
                            ? `images/${storagePath}`
                            : `videos/${storagePath}`;

                }

                console.log(
                    "Deleting storage file:",
                    storagePath
                );

                const {
                    error:
                        storageError
                } =
                    await supabase.storage
                        .from(
                            BUCKET_NAME
                        )
                        .remove(
                            [
                                storagePath
                            ]
                        );

                if (
                    storageError
                ) {

                    console.error(
                        "Storage delete error:",
                        storageError
                    );

                }

            }

            // -------------------------------------------------
            // DELETE DATABASE RECORD
            // -------------------------------------------------

            await pool.query(
                `
                DELETE FROM content
                WHERE id = $1
                `,
                [id]
            );

            return res.json({

                success: true,

                message:
                    "Content deleted successfully"

            });

        } catch (error) {

            console.error(
                "Delete error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to delete content"

            });

        }

    }
);

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    "/api/health",
    async (req, res) => {

        try {

            await pool.query(
                "SELECT 1"
            );

            return res.json({

                success: true,

                message:
                    "Server and database are working"

            });

        } catch (error) {

            console.error(
                "Health check error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Database connection failed"

            });

        }

    }
);

// =====================================================
// ERROR HANDLER
// =====================================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Server error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Something went wrong"

        });

    }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Annavaram Web running at http://localhost:${PORT}`
        );

    }
);