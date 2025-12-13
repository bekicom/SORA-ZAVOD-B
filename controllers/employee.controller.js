const Employee = require("../models/employee.model");

// ==============================
// 1. Hodim yaratish
// ==============================
exports.createEmployee = async (req, res) => {
  try {
    const { first_name, last_name, phone, floor, employee_id } = req.body;

    const exist = await Employee.findOne({ phone });
    if (exist) {
      return res
        .status(400)
        .json({ message: "Bu telefon raqam oldin ro'yxatdan o'tgan" });
    }

    const employee = await Employee.create({
      first_name,
      last_name,
      phone,
      floor,
      employee_id,
    });

    res.status(201).json({
      message: "Hodim qo'shildi",
      data: employee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// 2. Barcha hodimlar
// ==============================
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json({ data: employees });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// 3. Bitta hodim
// ==============================
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    res.json({ data: employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// 4. Yangilash
// ==============================
exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!employee) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    res.json({
      message: "Yangilandi",
      data: employee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// 5. O'chirish
// ==============================
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);

    if (!employee) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    res.json({
      message: "Hodim o'chirildi",
      data: employee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
