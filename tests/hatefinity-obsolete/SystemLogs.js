const fs = require('fs');
const path = require('path');
const process = require("process");

if(process.env.LOGS_FOLDER === undefined) {
    console.error("LOGS_FOLDER environment variable is not set. Please set it to the path where the logs should be stored. Defaults to './logs/'");
    process.env.LOGS_FOLDER = "./logs/"
}
const logsRoot = process.env.LOGS_FOLDER;
const userLogsPath = path.join(logsRoot, "user-logs");
const systemLogsPath = path.join(logsRoot, "system-logs");

async function safeWriteToFile(filePath, text) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {recursive: true});
        }

        // Create the file if it doesn't exist
        await fs.promises.open(filePath, 'a'); // Opens the file for appending; creates it if it doesn't exist.

        // Locking mechanism using a temporary file
        const lockFilePath = `${filePath}.lock`;
        while (true) {
            try {
                await fs.promises.open(lockFilePath, 'wx'); // Try to create a lock file
                break; // Exit loop if successful
            } catch (err) {
                if (err.code === 'EEXIST') {
                    // If lock file exists, wait and retry
                    await new Promise(resolve => setTimeout(resolve, 100));
                } else {
                    throw err;
                }
            }
        }

        // Perform the append operation
        text = `${new Date().toDateString()} - ${text}`;
        await fs.promises.appendFile(filePath, text);

        // Remove the lock file after the operation
        await fs.promises.unlink(lockFilePath);
    } catch (err) {
        console.error("Error handling file:", err);
    }
}

/**
 * Add system log
 * @param {Object} logData - an object {action:"actionName", details: "actionDetails"}
 */
async function systemLog(logData) {
    const folder = new Date().toJSON().split("T")[0];
    const logPath = path.join(systemLogsPath, folder);
    if (typeof logData.details === "object") {
        logData.details = JSON.stringify(logData.details);
    }
    let textToAppend = `${logData.action}: ${logData.details}\n`;
    await safeWriteToFile(logPath, textToAppend);
}

async function userLog(id, logData) {
    const logPath = path.join(userLogsPath, `${id}.log`);
    if (typeof logData.details === "object") {
        logData.details = JSON.stringify(logData.details);
    }
    let textToAppend = `${logData.action}: ${logData.details}\n`;
    await safeWriteToFile(logPath, textToAppend);
}

async function asUserLog(id, logData) {

}

module.exports = {
    systemLog,
    userLog,
    asUserLog
}
