import React, { useEffect, useState } from 'react';
import userImg from '../../assets/images/user.svg';

const EditOfficeHeadModal = ({ visible, onClose, head = {}, onSave }) => {
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [profileFile, setProfileFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (head) {
      setFirstName(head.FirstName || '');
      setMiddleInitial(head.MiddleInitial || '');
      setLastName(head.LastName || '');
      setPosition(head.Position || '');
      setContactInfo(head.ContactInfo || '');
      if (head.ProfilePic) {
        setPreview(
          head.ProfilePic.startsWith('http')
            ? head.ProfilePic
            : `http://localhost:5000/uploads/profile-pics/${head.ProfilePic}`
        );
      } else {
        setPreview(userImg);
      }
      setProfileFile(null);
    }
  }, [head]);

  useEffect(() => {
    if (!profileFile) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(profileFile);
  }, [profileFile]);

  if (!visible) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setProfileFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Prepare an object to return to parent. Parent can convert to FormData
    const updated = {
      HeadID: head.HeadID,
      FirstName: firstName,
      MiddleInitial: middleInitial,
      LastName: lastName,
      Position: position,
      ContactInfo: contactInfo,
      // ProfilePic will be the file object if changed, otherwise leave as-is
      ProfilePic: profileFile || head.ProfilePic,
      OfficeID: head.OfficeID,
    };

    onSave(updated);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 min-h-[70vh] max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Edit Office Head</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Grid Layout - 2x3 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* First Name */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter first name"
                disabled={isSubmitting}
              />
            </div>

            {/* Middle Initial */}
            <div>
              <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700 mb-1">
                Middle Initial
              </label>
              <input
                type="text"
                id="middleInitial"
                name="middleInitial"
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value)}
                maxLength="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Middle Initial"
                disabled={isSubmitting}
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter last name"
                disabled={isSubmitting}
              />
            </div>

            {/* Position */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                Position *
              </label>
              <input
                type="text"
                id="position"
                name="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter position/title"
                disabled={isSubmitting}
              />
            </div>

            {/* Contact Info */}
            <div>
              <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-1">
                Contact Info *
              </label>
              <input
                type="text"
                id="contactInfo"
                name="contactInfo"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Phone number or email"
                disabled={isSubmitting}
              />
            </div>

            {/* Profile Picture */}
            <div>
              <label htmlFor="profilePic" className="block text-sm font-medium text-gray-700 mb-1">
                Profile Picture
              </label>
              <div className="flex items-start gap-3">
                {/* Image Preview Circle */}
                <div className="flex-shrink-0 -mt-0.5">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* File Input */}
                <div className="flex-1">
                  <input
                    type="file"
                    id="profilePic"
                    name="profilePic"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">Choose a new profile picture to replace the existing one.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOfficeHeadModal;
