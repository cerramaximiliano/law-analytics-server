const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/emailService');

// Ruta para enviar correos electrónicos
router.post('/send-email', async (req, res) => {
    const { to, subject, htmlBody, textBody } = req.body;

    try {
        const result = await sendEmail(to, subject, htmlBody, textBody);
        res.status(200).json({ message: 'Correo enviado exitosamente', result });
    } catch (error) {
        res.status(500).json({ message: 'Error al enviar correo', error });
    }
});

module.exports = router;
