const isLogin = async (req, res, next) => {
    try {
        if (req.session.user) {
        } // User already logged in 👤
         else {
            return res.redirect('/'); // Redirect to login page 🚪
        }
        next(); // Proceed to next middleware ➡️
    } catch (error) {
        console.log("PP fail code: 4") // Log the error 🤯
        return res.render(error.message); // Render error message ⚠️
    }
}

const isLogout = async (req, res, next) => {
    try {
        if (req.session.user) {
            return res.redirect('/dashboard'); // Redirect to dashboard 🚀
        }
        next(); // Proceed to next middleware ➡️
    } catch (error) {
        console.log("PP fail code: 4") // Log the error 🤯
        return res.render(error.message); // Render error message ⚠️
    }
}

module.exports = {
    isLogin, // Export isLogin function 📤
    isLogout // Export isLogout function 📤
}