import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { practiceAreas } from '../data/lawyers';
import './EditProfile.css';

export default function EditProfile() {
    const { user, updateProfile, getDashboardPath } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        // Lawyer-specific
        jurisdiction: user?.jurisdiction || '',
        city: user?.city || '',
        experience: user?.experience || '',
        languages: Array.isArray(user?.languages)
            ? user.languages.join(', ')
            : user?.languages || '',
        gender: user?.gender || '',
        specializations: Array.isArray(user?.specializations)
            ? user.specializations
            : (user?.specializations
                ? user.specializations.split(',').map((s) => s.trim()).filter(Boolean)
                : []),
        consultationFee: user?.consultationFee || '',
        education: user?.education || '',
        barCouncilNumber: user?.barCouncilNumber || '',
        feesRange: user?.feesRange || '',
        profilePicture: user?.profilePicture || null,
        isProBono: user?.isProBono || false,
    });
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const isLawyer = user?.role === 'lawyer';

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setSaved(false);
        setError('');
    };

    const handleSpecializationToggle = (areaId) => {
        setFormData((prev) => {
            const specs = prev.specializations.includes(areaId)
                ? prev.specializations.filter((s) => s !== areaId)
                : [...prev.specializations, areaId];
            return { ...prev, specializations: specs };
        });
        setSaved(false);
        setError('');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB limit for localStorage
            setError('Image size should be less than 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, profilePicture: reader.result }));
            setSaved(false);
        };
        reader.onerror = () => {
            setError('Failed to read file.');
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Name is required.');
            return;
        }

        const updates = {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            bio: formData.bio.trim(),
            profilePicture: formData.profilePicture,
        };

        if (isLawyer) {
            updates.jurisdiction = formData.jurisdiction.trim();
            updates.city = formData.city.trim();
            updates.experience = formData.experience.toString().trim();
            updates.languages = formData.languages.trim();
            updates.gender = formData.gender;
            updates.specializations = formData.specializations;
            updates.consultationFee = formData.consultationFee.toString().trim();
            updates.education = formData.education.trim();
            updates.barCouncilNumber = formData.barCouncilNumber.trim();
            updates.feesRange = formData.feesRange.trim();
            updates.isProBono = formData.isProBono;
        }

        const result = updateProfile(updates);
        if (result.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="edit-profile container animate-fade-in-up">
            <div className="edit-profile__header">
                <button
                    className="edit-profile__back"
                    onClick={() => navigate(getDashboardPath())}
                >
                    ← Back to Dashboard
                </button>
                <h1 className="edit-profile__title">Edit Profile</h1>
                <p className="edit-profile__subtitle">
                    Update your personal information{isLawyer ? ' and professional details' : ''}
                </p>
            </div>

            <form className="edit-profile__form" onSubmit={handleSubmit}>
                {/* Avatar preview */}
                <div className="edit-profile__avatar-section">
                    <div className={`edit-profile__avatar ${isLawyer ? 'edit-profile__avatar--lawyer' : ''}`} style={{
                        backgroundImage: formData.profilePicture ? `url(${formData.profilePicture})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        color: formData.profilePicture ? 'transparent' : 'white'
                    }}>
                        {!formData.profilePicture && (formData.name ? formData.name.charAt(0).toUpperCase() : '?')}
                    </div>
                    <div>
                        <div className="edit-profile__avatar-name">{formData.name || 'Your Name'}</div>
                        <div className="edit-profile__avatar-role">
                            <span className={`dashboard__role-badge dashboard__role-badge--${user?.role}`}>
                                {user?.role}
                            </span>
                        </div>
                        <div style={{ marginTop: '0.75rem' }}>
                            <label htmlFor="ep-photo" className="btn btn--outline btn--sm" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                📸 {formData.profilePicture ? 'Change Photo' : 'Upload Photo'}
                            </label>
                            <input
                                id="ep-photo"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            {formData.profilePicture && (
                                <button
                                    type="button"
                                    className="btn btn--sm"
                                    style={{ color: 'var(--red-600)', marginLeft: '1rem', background: 'transparent' }}
                                    onClick={() => setFormData(prev => ({ ...prev, profilePicture: null }))}
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="edit-profile__section">
                    <h2 className="edit-profile__section-title">Personal Information</h2>

                    <div className="edit-profile__field-group">
                        <div className="edit-profile__field">
                            <label htmlFor="ep-name">Full Name *</label>
                            <input
                                id="ep-name"
                                name="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Your full name"
                                required
                            />
                        </div>
                        <div className="edit-profile__field">
                            <label htmlFor="ep-email">Email Address</label>
                            <input
                                id="ep-email"
                                type="email"
                                value={formData.email}
                                disabled
                                className="edit-profile__input--disabled"
                            />
                            <span className="edit-profile__hint">Email cannot be changed</span>
                        </div>
                    </div>

                    <div className="edit-profile__field-group">
                        <div className="edit-profile__field">
                            <label htmlFor="ep-phone">Phone Number</label>
                            <input
                                id="ep-phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 XXXXX XXXXX"
                            />
                        </div>
                        {isLawyer && (
                            <div className="edit-profile__field">
                                <label htmlFor="ep-gender">Gender</label>
                                <select
                                    id="ep-gender"
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="edit-profile__field">
                        <label htmlFor="ep-bio">
                            {isLawyer ? 'Professional Summary' : 'About You'}
                        </label>
                        <textarea
                            id="ep-bio"
                            name="bio"
                            value={formData.bio}
                            onChange={handleChange}
                            placeholder={isLawyer
                                ? 'Describe your practice, areas of expertise, and approach to client service...'
                                : 'Tell us a bit about yourself...'}
                            rows={4}
                        />
                    </div>
                </div>

                {/* Lawyer-specific fields */}
                {isLawyer && (
                    <div className="edit-profile__section">
                        <h2 className="edit-profile__section-title">Professional Details</h2>

                        <div className="edit-profile__field-group">
                            <div className="edit-profile__field">
                                <label htmlFor="ep-city">City *</label>
                                <input
                                    id="ep-city"
                                    name="city"
                                    type="text"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="e.g. Mumbai"
                                />
                                <span className="edit-profile__hint">Used for location-based search</span>
                            </div>
                            <div className="edit-profile__field">
                                <label htmlFor="ep-jurisdiction">Jurisdiction / Court</label>
                                <input
                                    id="ep-jurisdiction"
                                    name="jurisdiction"
                                    type="text"
                                    value={formData.jurisdiction}
                                    onChange={handleChange}
                                    placeholder="e.g. Bombay High Court"
                                />
                            </div>
                        </div>

                        <div className="edit-profile__field-group">
                            <div className="edit-profile__field">
                                <label htmlFor="ep-fee">Base Consultation Fee (₹)</label>
                                <input
                                    id="ep-fee"
                                    name="consultationFee"
                                    type="number"
                                    min="0"
                                    value={formData.consultationFee}
                                    onChange={handleChange}
                                    placeholder="e.g. 2000"
                                />
                                <span className="edit-profile__hint">Flat rate for first meeting</span>
                            </div>
                            <div className="edit-profile__field">
                                <label htmlFor="ep-fees-range">Display Fees Range</label>
                                <input
                                    id="ep-fees-range"
                                    name="feesRange"
                                    type="text"
                                    value={formData.feesRange}
                                    onChange={handleChange}
                                    placeholder="e.g. ₹2,000 – ₹5,000"
                                />
                                <span className="edit-profile__hint">Shown on your profile card</span>
                            </div>
                        </div>

                        <div className="edit-profile__field">
                            <label htmlFor="ep-languages">Languages Spoken</label>
                            <input
                                id="ep-languages"
                                name="languages"
                                type="text"
                                value={formData.languages}
                                onChange={handleChange}
                                placeholder="e.g. English, Hindi, Marathi (comma separated)"
                            />
                            <span className="edit-profile__hint">Separate multiple languages with commas</span>
                        </div>

                        <div className="edit-profile__field-group">
                            <div className="edit-profile__field">
                                <label htmlFor="ep-education">Education</label>
                                <input
                                    id="ep-education"
                                    name="education"
                                    type="text"
                                    value={formData.education}
                                    onChange={handleChange}
                                    placeholder="e.g. LL.B., National Law School"
                                />
                            </div>
                            <div className="edit-profile__field">
                                <label htmlFor="ep-bar">Bar Council Number</label>
                                <input
                                    id="ep-bar"
                                    name="barCouncilNumber"
                                    type="text"
                                    value={formData.barCouncilNumber}
                                    onChange={handleChange}
                                    placeholder="e.g. MH/1234/2018"
                                />
                            </div>
                        </div>

                        {/* Practice Areas */}
                        <div className="edit-profile__field">
                            <label>Practice Areas</label>
                            <span className="edit-profile__hint" style={{ display: 'block', marginBottom: '10px' }}>
                                Select all areas you practice — this makes you discoverable in search
                            </span>
                            <div className="edit-profile__specializations">
                                {practiceAreas.map((area) => (
                                    <button
                                        key={area.id}
                                        type="button"
                                        className={`edit-profile__spec-btn ${formData.specializations.includes(area.id) ? 'edit-profile__spec-btn--active' : ''}`}
                                        onClick={() => handleSpecializationToggle(area.id)}
                                    >
                                        {area.icon} {area.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pro Bono Toggle */}
                        <div className="edit-profile__field">
                            <label className="edit-profile__checkbox-label">
                                <input
                                    type="checkbox"
                                    name="isProBono"
                                    checked={formData.isProBono}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isProBono: e.target.checked }))}
                                />
                                <span>🤝 Offer Pro Bono Services</span>
                            </label>
                            <span className="edit-profile__hint" style={{ marginLeft: '24px', display: 'block' }}>
                                Check this if you provide free legal services for people who cannot afford representation. You will be highlighted in search results with a special badge.
                            </span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="edit-profile__actions">
                    {error && <div className="edit-profile__error">{error}</div>}
                    {saved && <div className="edit-profile__success">✅ Profile updated! You are now listed in search results.</div>}
                    <div className="edit-profile__buttons">
                        <button
                            type="button"
                            className="btn btn--outline"
                            onClick={() => navigate(getDashboardPath())}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn--gold">
                            Save Changes
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
