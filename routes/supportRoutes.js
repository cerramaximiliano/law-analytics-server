const express = require('express');
const router = express.Router();
const { createSupportContact,
    getAllSupportContacts,
    getSupportContact,
    updateSupportContact,
    deleteSupportContact } = require('../controllers/supportContactController.js');
const authMiddleware = require('../middlewares/authMiddleware.js');

// Ruta pública para crear un contacto de soporte
router.post('/', authMiddleware, createSupportContact);

// Rutas protegidas (solo admin o personal de soporte)
router.get(
    '/',
    authMiddleware,
    getAllSupportContacts
);

router.get(
    '/:id',
    authMiddleware,
    getSupportContact
);

router.put(
    '/:id',
    authMiddleware,
    updateSupportContact
);

router.delete(
    '/:id',
    authMiddleware,
    deleteSupportContact
);

module.exports = router;