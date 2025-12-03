const app = require("express")(); // Initialize express app 🚀
const mongoose = require("mongoose"); // Import mongoose library ✅
const http = require("http").Server(app) // Import http

const config = require("./config/config"); // Import config module ⚙️
const router = require("./Routes/router"); // Import router module 🧭
const startCleanupSchedule = require('./utils/cleanup');

startCleanupSchedule.startCleanupSchedule();
const PORT = config.port; // Get port from config 🚪

const ConnectDB = async () => {
    try {
        await mongoose.connect(config.db).then(() => { // Connect to database 👍
            console.log("Database connected ✨"); // Log success message 🎉
        }).catch((error) => { // Handle connection errors ❌
            setTimeout(ConnectDB, 20000); // Retry after 20 seconds ⏱️
            console.warn("PP fail code: 1"); // Log error code ⚠️
        });
    } catch (error) { // Catch any other errors 🚨
        console.log(error); // Log the error 😬
    }
}
ConnectDB(); // Call connect function 🔗

app.use("/", router); // Use router middleware 🛣️

http.listen(PORT, () => { // Start the server 🚀
    try {
        console.log(`build sucessfully 🪓`); // Log success message 🎈
    } catch (error) { // Catch any errors 💥
        console.log(error); // Log the error 🤯
        console.warn("PP fail code: 2"); // Log the fail code ❗
    }
});