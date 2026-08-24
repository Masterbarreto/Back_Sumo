// filepath: api/routes/users.js
import express from "express";
import { loginUser } from "../controllers/users/Login.js";
import { createUser } from "../controllers/users/Create.js";
import { logoutUser } from "../controllers/users/Logout.js";
import { logUserActivity, getUserActivities } from "../controllers/users/UserActivity.js";
import { ResetPassWord } from "../controllers/users/ResetPassword.js"; 
import { verifyUser } from "../controllers/users/Verify.js";
import { requestPasswordReset } from "../controllers/users/PasswordReset.js";

const router = express.Router();

// Route for user registration
router.post("/register", createUser);

// Route for user login
router.post("/login", loginUser);

// Route for user logout
router.delete("/logout/:id", logoutUser);

// Route for logging user activity
router.post("/activity", logUserActivity);

// Route for retrieving user activities
router.get("/activity/:userId", getUserActivities);

// Route for password reset
router.post("/verify", verifyUser);

router.post("/request-password-reset", requestPasswordReset);
// Route for resetting password
router.post("/reset-password", ResetPassWord);

export default router;