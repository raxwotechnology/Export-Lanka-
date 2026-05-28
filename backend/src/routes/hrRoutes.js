import express from 'express';
import {
    createDepartment, getDepartments, updateDepartment, deleteDepartment,
    createDesignation, getDesignations, updateDesignation, deleteDesignation,
    createEmployee, getEmployees, getEmployeeById, updateEmployee, deleteEmployee,
    createShift, getShifts, updateShift, deleteShift,
    markAttendance, getAttendance, bulkMarkAttendance,
    createLeaveRequest, getLeaveRequests, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest,
    createHoliday, getHolidays, updateHoliday, deleteHoliday,
    createSalaryStructure, getSalaryStructures, updateSalaryStructure, deleteSalaryStructure,
} from '../controllers/hrController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();
router.use(protect);

// Departments
router.route('/departments')
    .get(requirePermission('hr.employees.view'), getDepartments)
    .post(requirePermission('hr.departments.manage'), createDepartment);

router.route('/departments/:id')
    .put(requirePermission('hr.departments.manage'), updateDepartment)
    .delete(requirePermission('hr.departments.manage'), deleteDepartment);

// Designations
router.route('/designations')
    .get(requirePermission('hr.employees.view'), getDesignations)
    .post(requirePermission('hr.designations.manage'), createDesignation);

router.route('/designations/:id')
    .put(requirePermission('hr.designations.manage'), updateDesignation)
    .delete(requirePermission('hr.designations.manage'), deleteDesignation);

// Employees
router.route('/employees')
    .get(requirePermission('hr.employees.view'), getEmployees)
    .post(requirePermission('hr.employees.manage'), createEmployee);

router.route('/employees/:id')
    .get(requirePermission('hr.employees.view'), getEmployeeById)
    .put(requirePermission('hr.employees.manage'), updateEmployee)
    .delete(requirePermission('hr.employees.manage'), deleteEmployee);

// Shifts
router.route('/shifts')
    .get(requirePermission('hr.shifts.manage'), getShifts)
    .post(requirePermission('hr.shifts.manage'), createShift);

router.route('/shifts/:id')
    .put(requirePermission('hr.shifts.manage'), updateShift)
    .delete(requirePermission('hr.shifts.manage'), deleteShift);

// Attendance
router.route('/attendance')
    .get(requirePermission('hr.attendance.view'), getAttendance)
    .post(requirePermission('hr.attendance.manage'), markAttendance);

router.post('/attendance/bulk', requirePermission('hr.attendance.manage'), bulkMarkAttendance);

// Leave
router.route('/leaves')
    .get(requirePermission('hr.leaves.view'), getLeaveRequests)
    .post(requirePermission('hr.leaves.manage', 'hr.employees.view'), createLeaveRequest);

router.patch('/leaves/:id/approve', requirePermission('hr.leaves.manage'), approveLeaveRequest);
router.patch('/leaves/:id/reject', requirePermission('hr.leaves.manage'), rejectLeaveRequest);
router.patch('/leaves/:id/cancel', requirePermission('hr.leaves.manage'), cancelLeaveRequest);

// Holidays
router.route('/holidays')
    .get(requirePermission('dashboard.view'), getHolidays)
    .post(requirePermission('hr.holidays.manage'), createHoliday);

router.route('/holidays/:id')
    .put(requirePermission('hr.holidays.manage'), updateHoliday)
    .delete(requirePermission('hr.holidays.manage'), deleteHoliday);

// Salary structures
router.route('/salary-structures')
    .get(requirePermission('hr.salary.view'), getSalaryStructures)
    .post(requirePermission('hr.salary.manage'), createSalaryStructure);

router.route('/salary-structures/:id')
    .put(requirePermission('hr.salary.manage'), updateSalaryStructure)
    .delete(requirePermission('hr.salary.manage'), deleteSalaryStructure);

export default router;