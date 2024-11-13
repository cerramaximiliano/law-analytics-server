const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema(
	{
		avatarType: {
			type: String,
			required: false,
		},
		avatarIcon: {
			type: String,
			enum: ["Gift", "MessageText1", "Setting2"],
			required: false,
		},
		avatarSize: {
			type: Number,
			required: false,
		},
		avatarInitial: {
			type: String,
			required: false,
		},
		primaryText: {
			type: String,
			required: true,
		},
		primaryVariant: {
			type: String,
			required: true,
		},
		secondaryText: {
			type: String,
			required: true,
		},
		actionText: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: { createdAt: true, updatedAt: false },
	}
);

module.exports = mongoose.model("Alert", AlertSchema);
