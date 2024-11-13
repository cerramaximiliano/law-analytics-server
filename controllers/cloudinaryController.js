const { cloudinary } = require("../config/cloudinaryConfig");

const User = require("../models/User"); // Asegúrate de importar el modelo de usuario
const logger = require("../utils/logger");

exports.uploadAvatar = async (req, res) => {
  try {
    const { userId } = req.body; // Asume que tienes el `userId` en el cuerpo de la solicitud
    const file = req.files.image; // La imagen enviada desde el frontend

    // Subir la imagen a Cloudinary
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "user_avatars",
    });

    // Actualizar la propiedad `picture` del usuario con la URL de Cloudinary
    const user = await User.findByIdAndUpdate(
      userId,
      { picture: result.secure_url },
      { new: true }
    );

    res.json({ url: result.secure_url });
  } catch (error) {
    console.log(error);
    logger.error("Error al subir la imagen:", error);
    res.status(500).json({ message: "Error al subir la imagen" });
  }
};
