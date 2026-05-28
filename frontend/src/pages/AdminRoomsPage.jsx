import { useEffect, useMemo, useState } from 'react';
import MessageBox from '../components/MessageBox.jsx';
import { apiDelete, apiGet, apiPatch, apiPost, apiUploadFile } from '../services/api.js';
import { getAdminToken } from '../utils/adminSession.js';
import { formatPeso } from '../utils/format.js';

const initialRoomTypeForm = {
  id: null,
  name: '',
  description: '',
  base_capacity: 2,
  max_capacity: 2,
  base_price: 2500,
  extra_guest_fee: 0
};

const initialRoomForm = {
  id: null,
  room_type_id: '',
  room_number: '',
  room_name: '',
  description: '',
  floor_label: '',
  max_guests_override: '',
  price_override: '',
  status: 'available',
  is_featured: false,
  is_active: true
};

const initialImageForm = {
  image_url: '',
  alt_text: '',
  sort_order: 1,
  is_primary: false
};

function toNumberOrEmpty(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : '';
}

function AdminRoomsPage() {
  const token = getAdminToken();

  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomImages, setRoomImages] = useState([]);

  const [roomTypeForm, setRoomTypeForm] = useState(initialRoomTypeForm);
  const [roomForm, setRoomForm] = useState(initialRoomForm);
  const [imageForm, setImageForm] = useState(initialImageForm);
  const [roomFilterTypeId, setRoomFilterTypeId] = useState('');

  const [message, setMessage] = useState(null);
  const [imageMessage, setImageMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function loadRoomTypes() {
    const data = await apiGet('/admin/room-types', { token });
    setRoomTypes(Array.isArray(data) ? data : []);
  }

  async function loadRooms() {
    const query = roomFilterTypeId ? `?room_type_id=${encodeURIComponent(roomFilterTypeId)}` : '';
    const data = await apiGet(`/admin/rooms${query}`, { token });
    setRooms(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    async function loadAll() {
      try {
        setMessage(null);
        await Promise.all([loadRoomTypes(), loadRooms()]);
      } catch (error) {
        setMessage({ type: 'error', text: error.message });
      } finally {
        setLoading(false);
      }
    }

    loadAll().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (loading) {
      return;
    }

    loadRooms().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomFilterTypeId]);

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) {
      return null;
    }

    return rooms.find((room) => room.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    async function loadImages() {
      if (!selectedRoomId) {
        setRoomImages([]);
        return;
      }

      try {
        setImageMessage(null);
        const data = await apiGet(`/admin/rooms/${selectedRoomId}/images`, { token });
        setRoomImages(Array.isArray(data) ? data : []);
      } catch (error) {
        setRoomImages([]);
        setImageMessage({ type: 'error', text: error.message });
      }
    }

    loadImages().catch(() => {});
  }, [selectedRoomId, token]);

  function updateRoomTypeField(event) {
    const { name, value } = event.target;
    setRoomTypeForm((current) => ({
      ...current,
      [name]: name === 'name' || name === 'description' ? value : toNumberOrEmpty(value)
    }));
  }

  function startEditRoomType(roomType) {
    setRoomTypeForm({
      id: roomType.id,
      name: roomType.name || '',
      description: roomType.description || '',
      base_capacity: Number(roomType.base_capacity || 0),
      max_capacity: Number(roomType.max_capacity || 0),
      base_price: Number(roomType.base_price || 0),
      extra_guest_fee: Number(roomType.extra_guest_fee || 0)
    });
    setMessage(null);
  }

  function resetRoomTypeForm() {
    setRoomTypeForm(initialRoomTypeForm);
  }

  async function handleDeleteRoomType(roomTypeId) {
    if (!window.confirm('Are you sure you want to delete this room type?')) {
      return;
    }

    try {
      setMessage(null);
      await apiDelete(`/admin/room-types/${roomTypeId}`, { token });
      setMessage({ type: 'success', text: 'Room type deleted successfully.' });
      await loadRoomTypes();
      resetRoomTypeForm();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  }

  async function handleSaveRoomType(event) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      name: roomTypeForm.name,
      description: roomTypeForm.description || null,
      base_capacity: Number(roomTypeForm.base_capacity),
      max_capacity: Number(roomTypeForm.max_capacity),
      base_price: Number(roomTypeForm.base_price),
      extra_guest_fee: Number(roomTypeForm.extra_guest_fee || 0)
    };

    if (!payload.name) {
      setMessage({ type: 'error', text: 'Room type name is required.' });
      return;
    }

    try {
      setSavingType(true);
      const saved = roomTypeForm.id
        ? await apiPatch(`/admin/room-types/${roomTypeForm.id}`, payload, { token })
        : await apiPost('/admin/room-types', payload, { token });

      setRoomTypes((current) => {
        const next = roomTypeForm.id
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved];
        return next.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      });

      setMessage({ type: 'success', text: roomTypeForm.id ? 'Room type updated.' : 'Room type created.' });
      resetRoomTypeForm();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSavingType(false);
    }
  }

  function updateRoomField(event) {
    const { name, value, type, checked } = event.target;
    setRoomForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function startEditRoom(room) {
    setRoomForm({
      id: room.id,
      room_type_id: String(room.room_type_id || ''),
      room_number: room.room_number || '',
      room_name: room.room_name || '',
      description: room.description || '',
      floor_label: room.floor_label || '',
      max_guests_override: room.max_guests_override === null || room.max_guests_override === undefined ? '' : String(room.max_guests_override),
      price_override: room.price_override === null || room.price_override === undefined ? '' : String(room.price_override),
      status: room.status || 'available',
      is_featured: Boolean(room.is_featured),
      is_active: Boolean(room.is_active)
    });
    setSelectedRoomId(room.id);
    setMessage(null);
  }

  function resetRoomForm() {
    setRoomForm(initialRoomForm);
  }

  async function handleSaveRoom(event) {
    event.preventDefault();
    setMessage(null);

    const payload = {
      room_type_id: Number(roomForm.room_type_id),
      room_number: roomForm.room_number,
      room_name: roomForm.room_name,
      description: roomForm.description || null,
      floor_label: roomForm.floor_label || null,
      max_guests_override: roomForm.max_guests_override === '' ? null : Number(roomForm.max_guests_override),
      price_override: roomForm.price_override === '' ? null : Number(roomForm.price_override),
      status: roomForm.status,
      is_featured: Boolean(roomForm.is_featured),
      is_active: Boolean(roomForm.is_active)
    };

    if (!payload.room_type_id || !payload.room_number || !payload.room_name) {
      setMessage({ type: 'error', text: 'Room type, room number, and room name are required.' });
      return;
    }

    try {
      setSavingRoom(true);
      const saved = roomForm.id
        ? await apiPatch(`/admin/rooms/${roomForm.id}`, payload, { token })
        : await apiPost('/admin/rooms', payload, { token });

      await loadRooms();

      setSelectedRoomId(saved.id);
      setMessage({ type: 'success', text: roomForm.id ? 'Room updated.' : 'Room created.' });
      resetRoomForm();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSavingRoom(false);
    }
  }

  function updateImageField(event) {
    const { name, value, type, checked } = event.target;
    setImageForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleUploadImageFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploadingImage(true);
      setImageMessage(null);
      const uploaded = await apiUploadFile(file, { token });
      setImageForm((current) => ({
        ...current,
        image_url: uploaded.file_url || uploaded.file_path || ''
      }));
      setImageMessage({ type: 'success', text: 'File uploaded successfully.' });
    } catch (error) {
      setImageMessage({ type: 'error', text: error.message });
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  }

  async function handleAddImage(event) {
    event.preventDefault();
    if (!selectedRoomId) {
      setImageMessage({ type: 'error', text: 'Select a room first to manage images.' });
      return;
    }

    if (!imageForm.image_url) {
      setImageMessage({ type: 'error', text: 'Image URL is required.' });
      return;
    }

    const payload = {
      image_url: imageForm.image_url,
      alt_text: imageForm.alt_text || null,
      sort_order: Number(imageForm.sort_order || 1),
      is_primary: Boolean(imageForm.is_primary)
    };

    try {
      setSavingImage(true);
      setImageMessage(null);
      await apiPost(`/admin/rooms/${selectedRoomId}/images`, payload, { token });
      const data = await apiGet(`/admin/rooms/${selectedRoomId}/images`, { token });
      setRoomImages(Array.isArray(data) ? data : []);
      setImageForm(initialImageForm);
      setImageMessage({ type: 'success', text: 'Image added.' });
    } catch (error) {
      setImageMessage({ type: 'error', text: error.message });
    } finally {
      setSavingImage(false);
    }
  }

  async function handleSetPrimary(imageId) {
    if (!selectedRoomId) {
      return;
    }

    try {
      setSavingImage(true);
      setImageMessage(null);
      await apiPatch(`/admin/rooms/${selectedRoomId}/images/${imageId}/primary`, {}, { token });
      const data = await apiGet(`/admin/rooms/${selectedRoomId}/images`, { token });
      setRoomImages(Array.isArray(data) ? data : []);
    } catch (error) {
      setImageMessage({ type: 'error', text: error.message });
    } finally {
      setSavingImage(false);
    }
  }

  async function handleDeleteImage(imageId) {
    if (!selectedRoomId) {
      return;
    }

    const confirmed = window.confirm('Delete this image?');
    if (!confirmed) {
      return;
    }

    try {
      setSavingImage(true);
      setImageMessage(null);
      await apiDelete(`/admin/rooms/${selectedRoomId}/images/${imageId}`, { token });
      const data = await apiGet(`/admin/rooms/${selectedRoomId}/images`, { token });
      setRoomImages(Array.isArray(data) ? data : []);
    } catch (error) {
      setImageMessage({ type: 'error', text: error.message });
    } finally {
      setSavingImage(false);
    }
  }

  return (
    <main className="main-grid">
      <div className="stack-grid">
        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Room Management</p>
            <h1 className="page-title">Rooms</h1>
            <p>Create room types, manage rooms, and set room images.</p>
          </div>

          <MessageBox message={message} />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Room types</h2>
            <p>Defines default capacity and pricing for each room category.</p>
          </div>

          <form className="booking-form" onSubmit={handleSaveRoomType}>
            <label>
              <span>Name</span>
              <input name="name" value={roomTypeForm.name} onChange={updateRoomTypeField} required />
            </label>

            <label>
              <span>Description</span>
              <textarea name="description" rows="3" value={roomTypeForm.description} onChange={updateRoomTypeField} />
            </label>

            <div className="field-grid">
              <label>
                <span>Base capacity</span>
                <input type="number" min="1" name="base_capacity" value={roomTypeForm.base_capacity} onChange={updateRoomTypeField} required />
              </label>
              <label>
                <span>Max capacity</span>
                <input type="number" min="1" name="max_capacity" value={roomTypeForm.max_capacity} onChange={updateRoomTypeField} required />
              </label>
            </div>

            <div className="field-grid">
              <label>
                <span>Base price</span>
                <input type="number" min="0" step="0.01" name="base_price" value={roomTypeForm.base_price} onChange={updateRoomTypeField} required />
              </label>
              <label>
                <span>Extra guest fee</span>
                <input type="number" min="0" step="0.01" name="extra_guest_fee" value={roomTypeForm.extra_guest_fee} onChange={updateRoomTypeField} />
              </label>
            </div>

            <div className="action-row">
              <button type="submit" className="btn btn-primary" disabled={savingType}>
                {savingType ? 'Saving...' : roomTypeForm.id ? 'Update Room Type' : 'Create Room Type'}
              </button>
              {roomTypeForm.id ? (
                <button type="button" className="btn btn-secondary" onClick={resetRoomTypeForm}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <div className={roomTypes.length ? 'room-list' : 'room-list empty-state'}>
            {loading ? 'Loading room types...' : roomTypes.length ? roomTypes.map((roomType) => (
              <article className="room-card" key={roomType.id}>
                <header>
                  <div>
                    <h3>{roomType.name}</h3>
                    <p className="room-meta">
                      Capacity {roomType.base_capacity} to {roomType.max_capacity} · Base {formatPeso(roomType.base_price)}
                    </p>
                  </div>
                </header>
                {roomType.description ? <p className="room-meta">{roomType.description}</p> : null}
                <div className="action-row">
                  <button type="button" className="btn btn-secondary" onClick={() => startEditRoomType(roomType)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => handleDeleteRoomType(roomType.id)}>
                    Delete
                  </button>
                </div>
              </article>
            )) : 'No room types yet.'}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Rooms</h2>
            <p>Create individual rooms and override pricing/capacity when needed.</p>
          </div>

          <div className="field-grid">
            <label>
              <span>Filter by room type</span>
              <select value={roomFilterTypeId} onChange={(event) => setRoomFilterTypeId(event.target.value)}>
                <option value="">All room types</option>
                {roomTypes.map((roomType) => (
                  <option key={roomType.id} value={String(roomType.id)}>
                    {roomType.name}
                  </option>
                ))}
              </select>
            </label>
            <div />
          </div>

          <form className="booking-form" onSubmit={handleSaveRoom}>
            <div className="field-grid">
              <label>
                <span>Room type</span>
                <select name="room_type_id" value={roomForm.room_type_id} onChange={updateRoomField} required>
                  <option value="">Select a room type</option>
                  {roomTypes.map((roomType) => (
                    <option key={roomType.id} value={String(roomType.id)}>
                      {roomType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Room number</span>
                <input name="room_number" value={roomForm.room_number} onChange={updateRoomField} required />
              </label>
            </div>

            <label>
              <span>Room name</span>
              <input name="room_name" value={roomForm.room_name} onChange={updateRoomField} required />
            </label>

            <label>
              <span>Description</span>
              <textarea name="description" rows="3" value={roomForm.description} onChange={updateRoomField} />
            </label>

            <div className="field-grid">
              <label>
                <span>Floor label</span>
                <input name="floor_label" value={roomForm.floor_label} onChange={updateRoomField} />
              </label>
              <label>
                <span>Status</span>
                <select name="status" value={roomForm.status} onChange={updateRoomField}>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="field-grid">
              <label>
                <span>Max guests override</span>
                <input type="number" min="1" name="max_guests_override" value={roomForm.max_guests_override} onChange={updateRoomField} placeholder="Optional" />
              </label>
              <label>
                <span>Price override</span>
                <input type="number" min="0" step="0.01" name="price_override" value={roomForm.price_override} onChange={updateRoomField} placeholder="Optional" />
              </label>
            </div>

            <div className="field-grid">
              <label className="checkbox-row">
                <input type="checkbox" name="is_featured" checked={roomForm.is_featured} onChange={updateRoomField} />
                <span>Featured</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" name="is_active" checked={roomForm.is_active} onChange={updateRoomField} />
                <span>Active</span>
              </label>
            </div>

            <div className="action-row">
              <button type="submit" className="btn btn-primary" disabled={savingRoom}>
                {savingRoom ? 'Saving...' : roomForm.id ? 'Update Room' : 'Create Room'}
              </button>
              {roomForm.id ? (
                <button type="button" className="btn btn-secondary" onClick={resetRoomForm}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <div className={rooms.length ? 'room-list' : 'room-list empty-state'}>
            {loading ? 'Loading rooms...' : rooms.length ? rooms.map((room) => (
              <article className="room-card" key={room.id}>
                <header>
                  <div>
                    <h3>{room.room_name}</h3>
                    <p className="room-meta">
                      {room.room_type_name} · Room {room.room_number} · {room.status}
                    </p>
                  </div>
                  <span className="tag">{formatPeso(room.effective_price)}</span>
                </header>
                {room.floor_label ? <p className="room-meta">{room.floor_label}</p> : null}
                <div className="action-row">
                  <button type="button" className="btn btn-secondary" onClick={() => startEditRoom(room)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedRoomId(room.id)}>
                    Images
                  </button>
                </div>
              </article>
            )) : 'No rooms yet.'}
          </div>
        </section>
      </div>

      <aside className="sidebar">
        <section className="panel">
          <div className="panel-header">
            <p className="eyebrow">Room Images</p>
            <h2>{selectedRoom ? `${selectedRoom.room_name}` : 'Select a room'}</h2>
            <p>Images are used on the Rooms page later. Set one as primary.</p>
          </div>

          <MessageBox message={imageMessage} />

          <form className="booking-form" onSubmit={handleAddImage}>
            <label>
              <span>Image URL</span>
              <input name="image_url" value={imageForm.image_url} onChange={updateImageField} placeholder="https://..." />
            </label>
            <label>
              <span>Upload file (image or PDF)</span>
              <input type="file" accept="image/*,application/pdf" onChange={handleUploadImageFile} disabled={uploadingImage || savingImage} />
            </label>
            {uploadingImage ? <div className="room-meta">Uploading file...</div> : null}
            <label>
              <span>Alt text</span>
              <input name="alt_text" value={imageForm.alt_text} onChange={updateImageField} />
            </label>
            <div className="field-grid">
              <label>
                <span>Sort order</span>
                <input type="number" min="1" name="sort_order" value={imageForm.sort_order} onChange={updateImageField} />
              </label>
              <label className="checkbox-row">
                <input type="checkbox" name="is_primary" checked={imageForm.is_primary} onChange={updateImageField} />
                <span>Primary</span>
              </label>
            </div>
            <div className="action-row">
              <button type="submit" className="btn btn-primary" disabled={savingImage}>
                {savingImage ? 'Saving...' : 'Add Image'}
              </button>
            </div>
          </form>

          <div className={roomImages.length ? 'room-list' : 'room-list empty-state'}>
            {selectedRoom ? (
              roomImages.length ? roomImages.map((image) => (
                <article className="room-card" key={image.id}>
                  <header>
                    <div>
                      <h3>{image.is_primary ? 'Primary image' : 'Image'}</h3>
                      <p className="room-meta">Order {image.sort_order}</p>
                    </div>
                    {image.is_primary ? <span className="tag">Primary</span> : null}
                  </header>
                  <p className="room-meta">{image.image_url}</p>
                  <div className="action-row">
                    {!image.is_primary ? (
                      <button type="button" className="btn btn-secondary" onClick={() => handleSetPrimary(image.id)} disabled={savingImage}>
                        Set Primary
                      </button>
                    ) : null}
                    <button type="button" className="btn btn-accent" onClick={() => handleDeleteImage(image.id)} disabled={savingImage}>
                      Delete
                    </button>
                  </div>
                </article>
              )) : 'No images yet.'
            ) : (
              'Choose a room to manage images.'
            )}
          </div>
        </section>
      </aside>
    </main>
  );
}

export default AdminRoomsPage;

