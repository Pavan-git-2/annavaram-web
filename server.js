require("dotenv").config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "annavaram_web",
    password: process.env.DB_PASSWORD,
    port: 5432
});

const app = express();
const PORT = 3000;

app.use(express.json());

// =========================
// ADMIN LOGIN
// =========================

app.post("/api/login", (req, res) => {

    const { email, password } = req.body;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        return res.json({
            success: true,
            message: "Login successful"
        });
    }

    res.status(401).json({
        success: false,
        message: "Invalid email or password"
    });
});

// =========================
// UPLOAD FOLDERS
// =========================

const imageFolder = path.join(
    __dirname,
    "public",
    "uploads",
    "images"
);

const videoFolder = path.join(
    __dirname,
    "public",
    "uploads",
    "videos"
);

fs.mkdirSync(imageFolder, { recursive: true });
fs.mkdirSync(videoFolder, { recursive: true });

// =========================
// STATIC FILES
// =========================

app.use(express.static(path.join(__dirname, "public")));

// =========================
// MULTER STORAGE
// =========================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        if (file.mimetype.startsWith("image/")) {
            cb(null, imageFolder);

        } else if (file.mimetype.startsWith("video/")) {
            cb(null, videoFolder);

        } else {
            cb(new Error("Only image and video files are allowed"));
        }
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 1024 * 1024 * 1024
    }
});

// =========================
// HOME
// =========================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "public", "index.html")
    );
});

// Get all uploaded content
app.get("/api/content", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM content
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error("Get content error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load content"
        });
    }
});

// DELETE CONTENT
// DELETE CONTENT
app.delete("/api/content/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Get file information before deleting database record
        const result = await pool.query(
            "SELECT * FROM content WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Content not found"
            });
        }

        const content = result.rows[0];

        // Delete database record
        await pool.query(
            "DELETE FROM content WHERE id = $1",
            [id]
        );

        // Delete physical file
        const folder =
            content.type === "image"
                ? imageFolder
                : videoFolder;

        const filePath = path.join(
            folder,
            content.filename
        );

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({
            success: true,
            message: "Content deleted successfully"
        });

    } catch (error) {
        console.error("Delete content error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete content"
        });
    }
});


// EDIT CONTENT TITLE
app.put("/api/content/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        const result = await pool.query(
            `UPDATE content
             SET title = $1
             WHERE id = $2
             RETURNING *`,
            [title, id]
        );

        res.json({
            success: true,
            message: "Content updated successfully",
            data: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update content"
        });
    }
});

// UPLOAD API
app.post("/api/upload", upload.single("file"), async (req, res) => {

    try {

        if (!req.file) {

            return res.status(400).json({
                success: false,
                message: "Please select a file"
            });
        }

        const type = req.file.mimetype.startsWith("image/")
            ? "image"
            : "video";

        const title =
            req.body.title || req.file.originalname;

        const category =
            req.body.category || "latest";

        const url =
            `/uploads/${type}s/${req.file.filename}`;

        const result = await pool.query(
            `INSERT INTO content
             (type, title, filename, url, category)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                type,
                title,
                req.file.filename,
                url,
                category
            ]
        );

        // IMPORTANT:
        // dashboard.js expects type, title and url directly

    res.json({
    success: true,
    message: "File uploaded and saved successfully",
    id: result.rows[0].id,
    type: result.rows[0].type,
    title: result.rows[0].title,
    filename: result.rows[0].filename,
    url: result.rows[0].url,
    category: result.rows[0].category
});

    } catch (error) {

        console.error("Upload error:", error);

        res.status(500).json({
            success: false,
            message: "Upload failed"
        });
    }
});

// =========================
// START SERVER
// =========================

app.listen(PORT, () => {

    console.log(
        `Annavaram Web running at http://localhost:${PORT}`
    );

});