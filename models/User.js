// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    verificationCode: {type: String},
}, { timestamps: true });

// Middleware para encriptar la contraseña antes de guardar
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Usuarios", UserSchema);
