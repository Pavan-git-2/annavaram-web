// =====================================================
// DASHBOARD ELEMENTS
// =====================================================

const uploadBtn = document.getElementById("uploadBtn");
const contentFile = document.getElementById("contentFile");
const contentTitle = document.getElementById("contentTitle");
const contentType = document.getElementById("contentType");
const contentCategory = document.getElementById("contentCategory");
const uploadMessage = document.getElementById("uploadMessage");

const videoContentList =
    document.getElementById("videoContentList");

const imageContentList =
    document.getElementById("imageContentList");


// =====================================================
// UPLOAD CONTENT
// =====================================================

uploadBtn.addEventListener("click", async () => {

    const file = contentFile.files[0];
    const title = contentTitle.value.trim();
    const type = contentType.value;
    const category = contentCategory.value;


    // -------------------------
    // VALIDATION
    // -------------------------

    if (!file) {

        uploadMessage.textContent =
            "Please select a file.";

        return;
    }


    if (!title) {

        uploadMessage.textContent =
            "Please enter a title.";

        return;
    }


    // -------------------------
    // FILE TYPE CHECK
    // -------------------------

    if (
        type === "image" &&
        !file.type.startsWith("image/")
    ) {

        uploadMessage.textContent =
            "Please select an image file.";

        return;
    }


    if (
        type === "video" &&
        !file.type.startsWith("video/")
    ) {

        uploadMessage.textContent =
            "Please select a video file.";

        return;
    }


    // -------------------------
    // FORM DATA
    // -------------------------

    const formData = new FormData();

    formData.append("file", file);
    formData.append("title", title);
    formData.append("type", type);
    formData.append("category", category);


    uploadMessage.textContent =
        "Uploading...";

    uploadBtn.disabled = true;
    uploadBtn.textContent =
        "Uploading...";


    try {

        const response = await fetch(
            "/api/upload",
            {
                method: "POST",
                body: formData
            }
        );


        const data = await response.json();

        console.log(
            "Upload response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Upload failed"
            );
        }


        uploadMessage.textContent =
            "Upload successful!";


        // -------------------------
        // CLEAR FORM
        // -------------------------

        contentTitle.value = "";
        contentFile.value = "";


        // -------------------------
        // RELOAD CONTENT
        // -------------------------

        await loadContent();


    } catch (error) {

        console.error(
            "Upload error:",
            error
        );

        uploadMessage.textContent =
            error.message ||
            "Upload failed";

    }


    uploadBtn.disabled = false;

    uploadBtn.textContent =
        "Upload Content";

});


// =====================================================
// CATEGORY NAME
// =====================================================

function getCategoryName(category) {

    if (category === "lyrical") {

        return "Lyrical Video";

    }

    if (category === "reels") {

        return "Reels";

    }

    if (
        category === "wedding" ||
        category === "wedding-promos"
    ) {

        return "Wedding Promo";

    }

    if (category === "images") {

        return "Images";

    }

    return "Latest Works";
}


// =====================================================
// ADD CONTENT TO DASHBOARD
// =====================================================

function addContentToDashboard(data) {

    if (!data) {
        return;
    }


    // =================================================
    // CREATE CONTENT ITEM
    // =================================================

    const item =
        document.createElement("div");

    item.className =
        "content-item";


    // =================================================
    // IMAGE
    // =================================================

    if (data.type === "image") {

        const image =
            document.createElement("img");

        image.src = data.url;

        image.alt =
            data.title || "Image";

        image.loading = "lazy";


        // IMAGE TITLE

        const title =
            document.createElement("h3");

        title.textContent =
            data.title || "Untitled";


        // CATEGORY

        const categoryText =
            document.createElement("p");

        categoryText.className =
            "content-category";

        categoryText.textContent =
            "Category: " +
            getCategoryName(data.category);


        item.appendChild(image);

        item.appendChild(title);

        item.appendChild(categoryText);

    }


    // =================================================
    // VIDEO
    // =================================================

    else if (data.type === "video") {

        const video =
            document.createElement("video");

        video.controls = true;

        video.preload = "metadata";


        const source =
            document.createElement("source");

        source.src =
            data.url;

        source.type =
            "video/mp4";


        video.appendChild(source);


        // VIDEO TITLE

        const title =
            document.createElement("h3");

        title.textContent =
            data.title || "Untitled";


        // CATEGORY

        const categoryText =
            document.createElement("p");

        categoryText.className =
            "content-category";

        categoryText.textContent =
            "Category: " +
            getCategoryName(data.category);


        item.appendChild(video);

        item.appendChild(title);

        item.appendChild(categoryText);

    }


    // =================================================
    // ACTION BUTTONS
    // =================================================

    const buttons =
        document.createElement("div");

    buttons.className =
        "content-actions";


    // EDIT BUTTON

    const editButton =
        document.createElement("button");

    editButton.className =
        "edit-btn";

    editButton.innerHTML =
        "✏️ <span>Edit Title</span>";


    // DELETE BUTTON

    const deleteButton =
        document.createElement("button");

    deleteButton.className =
        "delete-btn";

    deleteButton.innerHTML =
        "🗑️ <span>Delete</span>";


    buttons.appendChild(editButton);

    buttons.appendChild(deleteButton);

    item.appendChild(buttons);


    // =================================================
    // EDIT TITLE
    // =================================================

    editButton.addEventListener(
        "click",
        async () => {

            const newTitle =
                prompt(
                    "Enter new title:",
                    data.title
                );


            if (
                newTitle === null ||
                !newTitle.trim()
            ) {

                return;
            }


            try {

                const response =
                    await fetch(
                        `/api/content/${data.id}`,
                        {
                            method: "PUT",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    title:
                                        newTitle.trim()
                                })
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Update failed"
                    );
                }


                alert(
                    "Title updated successfully!"
                );


                await loadContent();


            } catch (error) {

                console.error(
                    "Edit error:",
                    error
                );


                alert(
                    error.message ||
                    "Update failed"
                );

            }

        }
    );


    // =================================================
    // DELETE CONTENT
    // =================================================

    deleteButton.addEventListener(
        "click",
        async () => {

            const confirmDelete =
                confirm(
                    `Are you sure you want to delete "${data.title}"?`
                );


            if (!confirmDelete) {

                return;
            }


            try {

                const response =
                    await fetch(
                        `/api/content/${data.id}`,
                        {
                            method: "DELETE"
                        }
                    );


                const result =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        result.message ||
                        "Delete failed"
                    );
                }


                alert(
                    "Content deleted successfully!"
                );


                await loadContent();


            } catch (error) {

                console.error(
                    "Delete error:",
                    error
                );


                alert(
                    error.message ||
                    "Delete failed"
                );

            }

        }
    );


    // =================================================
    // PUT ITEM IN CORRECT COLUMN
    // =================================================

    if (data.type === "video") {

        videoContentList.appendChild(item);

    }

    else if (data.type === "image") {

        imageContentList.appendChild(item);

    }

}


// =====================================================
// EMPTY MESSAGE
// =====================================================

function showEmptyMessages() {

    // -------------------------
    // VIDEOS
    // -------------------------

    if (
        videoContentList.children.length === 0
    ) {

        videoContentList.innerHTML = `
            <div class="empty-content">
                No videos uploaded yet.
            </div>
        `;
    }


    // -------------------------
    // IMAGES
    // -------------------------

    if (
        imageContentList.children.length === 0
    ) {

        imageContentList.innerHTML = `
            <div class="empty-content">
                No images uploaded yet.
            </div>
        `;
    }

}


// =====================================================
// LOAD ALL CONTENT
// =====================================================

async function loadContent() {

    try {

        const response =
            await fetch(
                "/api/content"
            );


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.message ||
                "Failed to load content"
            );
        }


        const content =
            result.data || [];


        // =================================================
        // COUNTS
        // =================================================

        const imageCount =
            document.getElementById(
                "imageCount"
            );

        const videoCount =
            document.getElementById(
                "videoCount"
            );

        const totalCount =
            document.getElementById(
                "totalCount"
            );


        const images =
            content.filter(
                item =>
                    item.type === "image"
            );


        const videos =
            content.filter(
                item =>
                    item.type === "video"
            );


        imageCount.textContent =
            images.length;

        videoCount.textContent =
            videos.length;

        totalCount.textContent =
            content.length;


        // =================================================
        // CLEAR BOTH COLUMNS
        // =================================================

        videoContentList.innerHTML = "";

        imageContentList.innerHTML = "";


        // =================================================
        // NO CONTENT
        // =================================================

        if (content.length === 0) {

            showEmptyMessages();

            return;
        }


        // =================================================
        // ADD CONTENT
        // =================================================

        content.forEach(
            item => {

                addContentToDashboard(
                    item
                );

            }
        );


        // =================================================
        // SHOW EMPTY MESSAGE FOR INDIVIDUAL COLUMN
        // =================================================

        showEmptyMessages();


    } catch (error) {

        console.error(
            "Load content error:",
            error
        );

    }

}


// =====================================================
// INITIAL LOAD
// =====================================================

loadContent();