"use strict";

async function generateUri(file) {
    // get the default base64-based uri
    const base64Uri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    // For certain ASCII-based file types, it may be optimal to
    // not use base64. For the contexts data: URIs usually appear in, this typically
    // an SVG.
    const bytes = new Uint8Array(await file.arrayBuffer());
    const plaintextParts = ["data:", file.type, ","];
    let plaintextFeasible = true;
    const validCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:/[]@!$&()*+,;=?<>";

    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] >= 0x7F || bytes[i] < 0x09) {
            // Bytes above 0x7F indicate that this is not ASCII, so we'll bail.
            // 0x09 (horizontal tab) is also the lowest control character that should appear
            // in a typical ASCII document.
            plaintextFeasible = false;
            break;
        } else {
            const char = String.fromCharCode(bytes[i]);
            if (validCharacters.indexOf(char) !== -1) {
                plaintextParts.push(char);
            } else if (bytes[i] < 0x10) {
                plaintextParts.push("%0");
                plaintextParts.push(bytes[i].toString(16));
            } else {
                plaintextParts.push("%");
                plaintextParts.push(bytes[i].toString(16));
            }
        }
    }

    const plaintextUri = plaintextFeasible ? plaintextParts.join("") : "";
    return plaintextFeasible && plaintextUri.length <= base64Uri.length ? plaintextUri : base64Uri;
}

function processFile(file) {
    if (file) {
        document.getElementById("name").value = file.name;
        document.getElementById("size").value = file.size + " bytes";
        document.getElementById("content-type").value = file.type;

        generateUri(file).then(uri => {
            document.getElementById("uri").value = uri;
            document.getElementById("uri-size").value = uri.length;
            document.getElementById("result").classList.remove("hidden");
        });
    }
    document.getElementById("copy").classList.remove("copied");
}

document.addEventListener("DOMContentLoaded", function () {
    document.querySelector("form").addEventListener("submit", e => e.preventDefault());

    document.getElementById("browse").addEventListener("click", e => document.getElementById("file").click());

    document.getElementById("file").addEventListener("change", function () {
        const file = this.files[0];
        processFile(file);
    });

    window.addEventListener("dragover", function (e) {
        e.preventDefault();
    });

    window.addEventListener("drop", function (e) {
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && e.dataTransfer.items[0].kind === "file") {
            processFile(e.dataTransfer.items[0].getAsFile());
        }
        e.preventDefault();
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
        const copyP = document.getElementById("copy");

        const copyButton = document.createElement("button");
        copyButton.textContent = "Copy to clipboard";

        copyButton.addEventListener("click", function () {
            const value = document.getElementById("uri").value;
            if (value) {
                navigator.clipboard.writeText(value).then(
                    () => document.getElementById("copy").classList.add("copied")
                );
            }
        });

        copyP.insertAdjacentElement("afterbegin", copyButton);
    }
});
