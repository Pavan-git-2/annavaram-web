const uploadBtn = document.getElementById("uploadBtn");
const contentFile = document.getElementById("contentFile");
const contentTitle = document.getElementById("contentTitle");
const contentType = document.getElementById("contentType");
const contentCategory = document.getElementById("contentCategory");
const uploadMessage = document.getElementById("uploadMessage");
const contentList = document.getElementById("contentList");

// =====================================================
// UPLOAD CONTENT
// =====================================================

uploadBtn.addEventListener("click", async () => {

    const file = contentFile.files[0];
    const title = contentTitle.value.trim();
    const type = contentType.value;
    const category = contentCategory.value;

    if (!file) {
        uploadMessage.textContent = "Please select a file.";
        return;
    }

    if (!title) {
        uploadMessage.textContent = "Please enter a title.";
        return;
    }

    // Check selected file type
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

    // Create form data
    const formData = new FormData();

    formData.append(
        "file",
        file
    );

    formData.append(
        "title",
        title
    );

    formData.append(
        "type",
        type
    );

    formData.append(
        "category",
        category
    );

    uploadMessage.textContent =
        "Uploading... Please wait.";

    uploadBtn.disabled = true;
    uploadBtn.textContent =
        "Uploading...";

    try {

        const response =
            await fetch(
                "/api/upload",
                {
                    method: "POST",
                    body: formData
                }
            );

        const data =
            await response.json();

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

        // Clear form
        contentTitle.value = "";
        contentFile.value = "";

        // Reload content
        await loadContent();

    } catch (error) {

        console.error(
            "Upload error:",
            error
        );

        uploadMessage.textContent =
            error.message ||
            "Upload failed";

    } finally {

        uploadBtn.disabled = false;

        uploadBtn.textContent =
            "Upload Content";

    }

});

// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}

// =====================================================
// GET CATEGORY NAME
// =====================================================

function getCategoryName(category) {

    if (
        category === "lyrical"
    ) {
        return "Lyrical Video";
    }

    if (
        category === "reels"
    ) {
        return "Reels";
    }

    if (
        category === "wedding" ||
        category === "wedding-promos"
    ) {
        return "Wedding Promo";
    }

    if (
        category === "images"
    ) {
        return "Images";
    }

    return "Latest Works";

}

// =====================================================
// ADD CONTENT TO DASHBOARD
// =====================================================

function addContentToDashboard(data) {

    const emptyContent =
        document.querySelector(
            ".empty-content"
        );

    if (emptyContent) {
        emptyContent.remove();
    }

    const item =
        document.createElement(
            "div"
        );

    item.className =
        "content-item";

    const safeTitle =
        escapeHtml(
            data.title
        );

    const safeUrl =
        escapeHtml(
            data.url
        );

    // =================================================
    // IMAGE
    // =================================================

    if (
        data.type === "image"
    ) {

        item.innerHTML = `

            <img
                src="${safeUrl}"
                alt="${safeTitle}"
                loading="lazy"
                onerror="this.style.display='none';"
            >

            <h3>
                ${safeTitle}
            </h3>

        `;

    }

    // =================================================
    // VIDEO
    // =================================================

    else if (
        data.type === "video"
    ) {

        item.innerHTML = `

            <video
                controls
                preload="metadata"
                playsinline
            >

                <source
                    src="${safeUrl}"
                >

                Your browser does not
                support video playback.

            </video>

            <h3>
                ${safeTitle}
            </h3>

        `;

    }

    // =================================================
    // CATEGORY
    // =================================================

    const categoryText =
        document.createElement(
            "p"
        );

    categoryText.className =
        "content-category";

    categoryText.textContent =
        "Category: " +
        getCategoryName(
            data.category
        );

    item.appendChild(
        categoryText
    );

    // =================================================
    // ACTION BUTTONS
    // =================================================

    const buttons =
        document.createElement(
            "div"
        );

    buttons.className =
        "content-actions";

    buttons.innerHTML = `

        <button
            class="edit-btn"
            type="button"
        >
            ✏️
            <span>
                Edit Title
            </span>
        </button>

        <button
            class="delete-btn"
            type="button"
        >
            🗑️
            <span>
                Delete
            </span>
        </button>

    `;

    item.appendChild(
        buttons
    );

    // =================================================
    // EDIT TITLE
    // =================================================

    const editBtn =
        buttons.querySelector(
            ".edit-btn"
        );

    editBtn.addEventListener(
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

                if (
                    !response.ok
                ) {

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
    // DELETE
    // =================================================

    const deleteBtn =
        buttons.querySelector(
            ".delete-btn"
        );

    deleteBtn.addEventListener(
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
                            method:
                                "DELETE"
                        }
                    );

                const result =
                    await response.json();

                if (
                    !response.ok
                ) {

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

    contentList.appendChild(
        item
    );

}

// =====================================================
// LOAD ALL CONTENT
// =====================================================

async function loadContent() {

    try {

        const response =
            await fetch(
                "/api/content",
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        const result =
            await response.json();

        if (
            !response.ok
        ) {

            throw new Error(
                result.message ||
                "Failed to load content"
            );

        }

        const content =
            Array.isArray(
                result.data
            )
                ? result.data
                : [];

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

        if (imageCount) {
            imageCount.textContent =
                images.length;
        }

        if (videoCount) {
            videoCount.textContent =
                videos.length;
        }

        if (totalCount) {
            totalCount.textContent =
                content.length;
        }

        // =================================================
        // CLEAR LIST
        // =================================================

        contentList.innerHTML = "";

        // =================================================
        // EMPTY
        // =================================================

        if (
            content.length === 0
        ) {

            contentList.innerHTML = `

                <div class="empty-content">

                    No content uploaded yet.

                </div>

            `;

            return;
        }

        // =================================================
        // SHOW CONTENT
        // =================================================

        content.forEach(
            item => {

                addContentToDashboard(
                    item
                );

            }
        );

    } catch (error) {

        console.error(
            "Load content error:",
            error
        );

        contentList.innerHTML = `

            <div class="empty-content">

                Failed to load content.

            </div>

        `;

    }

}

// =====================================================
// INITIAL LOAD
// =====================================================

loadContent();