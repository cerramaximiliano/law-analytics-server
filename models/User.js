const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    verificationCode: { type: String },
    isVerified: { type: Boolean },
    picture: { type: String },

    // Nuevas propiedades basadas en el tipo UserProfile
    address: { type: String },
    address1: { type: String },
    avatar: { type: String },
    contact: { type: String },
    country: { type: String },
    designation: { type: String },
    dob: { type: Date },
    note: { type: String },
    role: { type: String },
    skill: { type: [String] }, // Array de habilidades
    state: { type: String },
    subscription: { type: String },
    tier: { type: String },
    url: { type: String },
    zipCode: { type: String },

    // Contador de cálculos activos
    activeCalculatorsCount: { type: Number, default: 0 },
    activeFoldersCount: { type: Number, default: 0 },

    // Puntaje de completitud del perfil (0-100)
    profileCompletionScore: { type: Number, default: 0 },

    // Subdocumento de usuarios según la definición de User
    users: [
      {
        userId: { type: String },
        name: { type: String },
        email: { type: String },
        role: { type: String },
        status: { type: String },
        avatar: { type: String },
      },
    ],


    resetPasswordExpires: {
      type: Date,
      default: null
    },

  },
  { timestamps: true }
);

// Middleware para encriptar la contraseña antes de guardar
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Middleware para calcular el puntaje de completitud antes de guardar
UserSchema.pre("save", function (next) {
  this.profileCompletionScore = calculateCompletionScore(this);
  next();
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Función para calcular el puntaje de completitud del perfil
function calculateCompletionScore(user) {
  const fieldsToCheck = [
    { field: 'firstName', weight: 10 },
    { field: 'lastName', weight: 10 },
    { field: 'email', weight: 15 },
    { field: 'avatar', weight: 5 },
    { field: 'contact', weight: 10 },
    { field: 'address', weight: 10 },
    { field: 'country', weight: 5 },
    { field: 'state', weight: 5 },
    { field: 'zipCode', weight: 5 },
    { field: 'designation', weight: 5 },
    { field: 'dob', weight: 5 },
    { field: 'note', weight: 5 },
    { field: 'skill', weight: 10 } // Para arrays, verificamos si tiene elementos
  ];

  let totalScore = 0;

  fieldsToCheck.forEach(item => {
    const fieldValue = user[item.field];
    if (fieldValue) {
      if (Array.isArray(fieldValue)) {
        // Si es un array, verificamos que tenga al menos un elemento
        if (fieldValue.length > 0) {
          totalScore += item.weight;
        }
      } else {
        // Para campos regulares, verificamos que no estén vacíos
        if (typeof fieldValue === 'string' && fieldValue.trim() !== '') {
          totalScore += item.weight;
        } else if (fieldValue instanceof Date || typeof fieldValue === 'number' || typeof fieldValue === 'boolean') {
          totalScore += item.weight;
        }
      }
    }
  });

  return Math.min(100, totalScore); // Aseguramos que no exceda 100
}

// Añadimos la función como método estático para poder usarla en el controlador
UserSchema.statics.calculateCompletionScore = calculateCompletionScore;

module.exports = mongoose.model("Usuarios", UserSchema);