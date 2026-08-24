import mongoose from "mongoose";

const userActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Users" // Assuming 'professores' is the user collection
    },
    action: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const UserActivity = mongoose.model("UserActivity", userActivitySchema);

export default UserActivity;