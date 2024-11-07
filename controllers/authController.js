// controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({
          message:
            "El usuario ya existe. Resetee el password si no lo recuerda.",
        });

    const user = new User({ email, password, firstName, lastName });
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    user.verificationCode = verificationCode;
    await user.save();

    const token = generateToken(user);
    res
      .status(201)
      .json({ user, serviceToken: token, needsVerification: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Email y/o password inválidos" });
    }

    const token = generateToken(user);
    res.json({ user, serviceToken: token });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
