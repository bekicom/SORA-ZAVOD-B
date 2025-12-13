import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee_id: {
      type: String,
      required: true,
      trim: true,
    },

    // Hodim haqidagi ma'lumot uchun reference (ixtiyoriy, qulay bo'ladi)
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // Kelgan vaqt
    check_in: {
      type: Date,
      default: null,
    },

    // Ketgan vaqt
    check_out: {
      type: Date,
      default: null,
    },

    // Sana bo'yicha qidirish oson bo‘lishi uchun
    date: {
      type: String, // "2025-01-30" formatida
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Bir kunda bir hodim uchun bitta davomat bo'lishi shart
attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);
