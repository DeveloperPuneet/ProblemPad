require("dotenv").config() // Load environment variables ⚙️

const { PORT, SECRET, DB, EMAIL, PASSWORD } = process.env; // Destructure env variables 🔑

module.exports = { // Export configuration object 📦
    port: PORT, // Expose the port 🚪
    secret: SECRET, // Expose the secret key 🤫
    db: DB, // Expose the database URL 💾
    email: EMAIL, // Expose the email address 📧
    password: PASSWORD // Expose the password 🔑
}