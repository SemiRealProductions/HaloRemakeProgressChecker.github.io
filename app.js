const missions = [
    ["a15", "The Pillar of Autumn"],
    ["a30", "Halo"],
    ["a50", "The Truth and Reconciliation"],
    ["b30", "The Silent Cartographer"],
    ["b40", "Assault on the Control Room"],
    ["c10", "343 Guilty Spark"],
    ["c20", "The Library"],
    ["c40", "Two Betrayals"],
    ["d20", "Keyes"],
    ["d40", "The Maw"],
    ["e10", "Boarding Action"],
    ["e20", "The Most Dangerous Game"],
    ["e30", "Heavy Burden"],
];

const completionTypes = [
    ["Easy", "Easy"],
    ["Normal", "Normal"],
    ["Heroic", "Heroic"],
    ["Legendary", "Legendary"],
    ["LASO", "LASO"],
    ["Remix", "Remix"],
    ["Remix.Deathless", "Deathless Remix"],
];

const tagPrefix = "Blam.Progress.Mission.Completion.";
const tagPattern = /Blam\.Progress\.Mission\.Completion\.(Easy|Normal|Heroic|Legendary|LASO|Remix(?:\.Deathless)?)\.(a15|a30|a50|b30|b40|c10|c20|c40|d20|d40|e10|e20|e30)(?=[^A-Za-z0-9_.]|$)/g;

const input = document.getElementById("saveFile");
const status = document.getElementById("status");
const summary = document.getElementById("summary");
const missionRows = document.getElementById("missionRows");
const dropZone = document.getElementById("dropZone");
const clearSave = document.getElementById("clearSave");
let loadVersion = 0;

function renderTable(completedTags = new Set()) {
    missionRows.replaceChildren();

    for (const [missionId, missionName] of missions) {
        const row = document.createElement("tr");
        const idCell = document.createElement("td");
        const missionCell = document.createElement("td");

        idCell.className = "mission-id";
        idCell.textContent = missionId;
        missionCell.textContent = missionName;
        row.append(idCell, missionCell);

        for (const [tagType, label] of completionTypes) {
            const cell = document.createElement("td");
            const mark = document.createElement("span");
            const tag = `${tagPrefix}${tagType}.${missionId}`;
            const isComplete = completedTags.has(tag);

            mark.className = `completion-mark${isComplete ? " complete" : ""}`;
            mark.textContent = isComplete ? "✓" : "–";
            mark.setAttribute(
                "aria-label",
                `${missionName}, ${label}: ${isComplete ? "complete" : "not found"}`,
            );

            cell.append(mark);
            row.append(cell);
        }

        missionRows.append(row);
    }

    summary.textContent = `${completedTags.size} of ${missions.length * completionTypes.length} completions found`;
}

function findCompletionTags(buffer) {
    const bytes = new Uint8Array(buffer);
    const decodedVersions = [
        new TextDecoder("latin1").decode(bytes),
        new TextDecoder("utf-16le").decode(bytes),
    ];

    // UTF-16 strings can begin at either an even or odd byte offset.
    if (bytes.length > 1) {
        decodedVersions.push(new TextDecoder("utf-16le").decode(bytes.subarray(1)));
    }

    const tags = new Set();

    for (const text of decodedVersions) {
        tagPattern.lastIndex = 0;
        for (const match of text.matchAll(tagPattern)) {
            tags.add(match[0]);
        }
    }

    return tags;
}

async function loadSave(file) {
    const currentLoad = ++loadVersion;
    status.classList.remove("error");

    if (!file) {
        return;
    }

    clearSave.disabled = false;
    status.textContent = `Reading ${file.name} locally…`;

    try {
        const buffer = await file.arrayBuffer();
        if (currentLoad !== loadVersion) {
            return;
        }

        const completedTags = findCompletionTags(buffer);

        renderTable(completedTags);
        status.textContent = completedTags.size
            ? `Loaded ${file.name} (${file.size.toLocaleString()} bytes).`
            : `Loaded ${file.name}, but no supported campaign completion tags were found.`;
    } catch (error) {
        if (currentLoad !== loadVersion) {
            return;
        }

        console.error(error);
        status.classList.add("error");
        status.textContent = "The file could not be read. Please select Progress.sav and try again.";
        renderTable();
    }
}

function resetSave() {
    loadVersion += 1;
    input.value = "";
    clearSave.disabled = true;
    dropZone.classList.remove("is-dragging");
    status.classList.remove("error");
    status.textContent = "No file selected.";
    renderTable();
}

input.addEventListener("change", () => {
    const file = input.files?.[0];

    if (file) {
        loadSave(file);
    } else {
        resetSave();
    }
});

let dragDepth = 0;

dropZone.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragDepth += 1;
    dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
});

dropZone.addEventListener("dragleave", () => {
    dragDepth -= 1;
    if (dragDepth <= 0) {
        dragDepth = 0;
        dropZone.classList.remove("is-dragging");
    }
});

dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dragDepth = 0;
    dropZone.classList.remove("is-dragging");

    const file = event.dataTransfer.files?.[0];
    if (file) {
        loadSave(file);
    }
});

clearSave.addEventListener("click", resetSave);

for (const copyButton of document.querySelectorAll("[data-copy-value]")) {
    copyButton.addEventListener("click", async () => {
        const originalLabel = copyButton.textContent.trim();

        try {
            await navigator.clipboard.writeText(copyButton.dataset.copyValue);
            copyButton.textContent = "Copied";
            window.setTimeout(() => {
                copyButton.textContent = originalLabel;
            }, 1600);
        } catch (error) {
            console.error(error);
            status.classList.add("error");
            status.textContent = "The path could not be copied automatically. Select the path and copy it manually.";
        }
    });
}

renderTable();
