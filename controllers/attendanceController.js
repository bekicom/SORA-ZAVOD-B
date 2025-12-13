import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";
import moment from "moment";

// === FaceID orqali kelish / ketishni yozish ===
export const punch = async (req, res) => {
  try {
    const { employee_id } = req.body;

    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id talab qilinadi",
      });
    }

    // Hodimni topamiz
    const employee = await Employee.findOne({ employee_id });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Hodim topilmadi",
      });
    }

    // Bugungi sana (YYYY-MM-DD)
    const today = moment().format("YYYY-MM-DD");

    // Bugungi attendance yozuvini qidiramiz
    let attendance = await Attendance.findOne({
      employee_id,
      date: today,
    });

    // === 1) Agar bugungi yozuv yo‘q bo‘lsa → CHECK-IN ===
    if (!attendance) {
      attendance = await Attendance.create({
        employee_id,
        employee: employee._id,
        date: today,
        check_in: new Date(),
      });

      return res.status(201).json({
        success: true,
        type: "check_in",
        message: "Hodim ishga keldi",
        data: attendance,
      });
    }

    // === 2) Agar check_in bor, lekin check_out yo‘q → CHECK-OUT ===
    if (attendance.check_in && !attendance.check_out) {
      attendance.check_out = new Date();
      await attendance.save();

      return res.status(200).json({
        success: true,
        type: "check_out",
        message: "Hodim ishdan ketdi",
        data: attendance,
      });
    }

    // === 3) Ikkalasi ham to‘ldirilgan → Bugungi davomat tugagan ===
    return res.status(200).json({
      success: false,
      type: "complete",
      message: "Bugungi davomat allaqachon yakunlangan",
      data: attendance,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server xatosi",
      error: error.message,
    });
  }
};

// === Barcha davomatlar ro'yxati ===
export const getAll = async (req, res) => {
  try {
    const list = await Attendance.find()
      .populate("employee")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: list,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Xatolik yuz berdi",
      error: error.message,
    });
  }
};

// === Bitta hodim bo‘yicha davomat ===
export const getByEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;

    const logs = await Attendance.find({ employee_id }).sort({ date: -1 });

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Xatolik yuz berdi",
    });
  }
};
