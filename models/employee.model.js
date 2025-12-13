const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    floor: { type: Number, enum: [1, 2], required: true },
    employee_id: {
      type: String,
      required: true,
      unique: true,
      minlength: 4,
      maxlength: 4,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
