const express = require('express');
const {
  getAdminRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  getAdminRooms,
  createRoom,
  updateRoom,
  getRoomImages,
  addRoomImage,
  deleteRoomImage,
  setPrimaryRoomImage
} = require('../controllers/adminRoom.controller');
const {
  authenticateAdmin,
  requireAdminRole
} = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/admin/room-types', authenticateAdmin, requireAdminRole, getAdminRoomTypes);
router.post('/admin/room-types', authenticateAdmin, requireAdminRole, createRoomType);
router.patch('/admin/room-types/:id', authenticateAdmin, requireAdminRole, updateRoomType);
router.delete('/admin/room-types/:id', authenticateAdmin, requireAdminRole, deleteRoomType);

router.get('/admin/rooms', authenticateAdmin, requireAdminRole, getAdminRooms);
router.post('/admin/rooms', authenticateAdmin, requireAdminRole, createRoom);
router.patch('/admin/rooms/:id', authenticateAdmin, requireAdminRole, updateRoom);

router.get('/admin/rooms/:id/images', authenticateAdmin, requireAdminRole, getRoomImages);
router.post('/admin/rooms/:id/images', authenticateAdmin, requireAdminRole, addRoomImage);
router.patch('/admin/rooms/:id/images/:imageId/primary', authenticateAdmin, requireAdminRole, setPrimaryRoomImage);
router.delete('/admin/rooms/:id/images/:imageId', authenticateAdmin, requireAdminRole, deleteRoomImage);

module.exports = router;

