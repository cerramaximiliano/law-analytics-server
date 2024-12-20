const Calculator = require("../models/Calculator");

const createCalculator = async (req, res) => {
  try {
    const calculator = await Calculator.create(req.body);
    res.status(201).json({ success: true, calculator });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getCalculatorsByUserId = async (req, res) => {
  try {
    const calculators = await Calculator.find({ userId: req.params.userId });
    res.json({ success: true, calculators });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getCalculatorsByGroupId = async (req, res) => {
  try {
    const calculators = await Calculator.find({ groupId: req.params.groupId });
    res.json({ success: true, calculators });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getCalculatorsByFolderId = async (req, res) => {
  try {
    const calculators = await Calculator.find({
      folderId: req.params.folderId,
    });
    res.json({ success: true, calculators });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getCalculatorsByUserIdTypeClass = async (req, res) => {
  try {
    const { userId, groupId, folderId, type, classType } = req.query;

    if (!folderId && !userId && !groupId) {
      return res.status(400).json({
        success: false,
        message:
          "Debe proporcionar al menos uno de los siguientes filtros: folderId, userId o groupId.",
      });
    }
    const filter = {};
    if (folderId) filter.folderId = folderId;
    if (type) filter.type = type;
    if (classType) filter.classType = classType;
    if (userId) filter.userId = userId;
    if (groupId) filter.groupId = groupId;

    const calculators = await Calculator.find(filter);
    if (!calculators.length) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron resultados con los filtros proporcionados.",
      });
    }

    res.status(200).json({ success: true, calculators });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCalculator = async (req, res) => {
  try {
    const calculator = await Calculator.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!calculator) throw new Error("Calculator not found");
    res.json({ success: true, calculator });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteCalculator = async (req, res) => {
  try {
    const calculator = await Calculator.findByIdAndDelete(req.params.id);
    if (!calculator) throw new Error("Calculator not found");
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCalculator,
  getCalculatorsByUserId,
  getCalculatorsByGroupId,
  getCalculatorsByFolderId,
  updateCalculator,
  deleteCalculator,
  getCalculatorsByUserIdTypeClass,
};
