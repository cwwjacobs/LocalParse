export function getExtension(filename) {
    const parts = filename.split(".");
    return parts.pop().toLowerCase();
}
