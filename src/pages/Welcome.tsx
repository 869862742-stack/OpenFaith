import React, { useState, useRef, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

function Welcome() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);

  useEffect(() => {
    const savedImage = localStorage.getItem('welcome_custom_image');
    if (savedImage) {
      setCustomImage(savedImage);
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        setCustomImage(imageData);
        localStorage.setItem('welcome_custom_image', imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div
        className="flex flex-col items-center"
      >
        <h1 className="text-3xl font-bold text-[#3B82F6] mb-2">OpenFaith</h1>
        <p className="text-sm text-[#94A3B8] mb-12">Open Faith · Open World</p>

        <div className="w-48 h-48 mb-12 relative">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          {customImage ? (
            <img
              src={customImage}
              alt=""
              className="w-full h-full object-cover rounded-2xl cursor-pointer"
              onClick={handleUploadClick}
            />
          ) : (
            <button
              onClick={handleUploadClick}
              className="w-full h-full rounded-2xl border-2 border-dashed border-[#3B82F6] border-opacity-40 flex flex-col items-center justify-center bg-[#FEF2F2] cursor-pointer"
            >
              <svg
                className="w-12 h-12 text-[#3B82F6] mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="text-sm text-[#3B82F6]">上传图片</span>
            </button>
          )}
        </div>

        <button
          onClick={() => navigate('/register')}
          className="w-full max-w-xs py-3 bg-[#3B82F6] text-white rounded-full font-medium mb-4"
        >
          注册
        </button>

        <button
          onClick={() => navigate('/login')}
          className="text-sm text-[#64748B]"
        >
          已有账号？<span className="text-[#3B82F6]">立即登录</span>
        </button>
      </div>
    </div>
  );
}

export default Welcome;
