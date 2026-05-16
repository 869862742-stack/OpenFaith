import React from 'react';

import { ArrowLeft, Camera, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Scan() {
  const navigate = useNavigate();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCameraScan = () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          alert('相机已开启，扫描功能开发中');
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(err => {
          alert('无法访问相机，请检查权限设置');
        });
    } else {
      alert('您的设备不支持相机功能');
    }
  };

  const handleAlbumSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`已选择图片: ${file.name}，正在识别二维码...`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">扫一扫</h1>
      </header>

      <div className="p-4">
        <div
          className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
        >
          <h2 className="text-base font-bold text-[#1E293B] mb-2">扫描二维码</h2>
          <p className="text-sm text-[#94A3B8] mb-5">使用相机扫描二维码或从相册选择图片</p>

          <button
            onClick={handleCameraScan}
            className="w-full h-12 bg-[#E11D48] text-white rounded-xl flex items-center justify-center gap-2 mb-3"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm font-medium">打开相机扫描</span>
          </button>

          <button
            onClick={handleAlbumSelect}
            className="w-full h-12 bg-gray-100 text-[#1E293B] rounded-xl flex items-center justify-center gap-2"
          >
            <Image className="w-5 h-5" />
            <span className="text-sm font-medium">从相册选择</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <p className="text-center text-sm text-[#94A3B8] mt-8">
          扫描二维码可以快速添加好友或加入群聊
        </p>
      </div>
    </div>
  );
}

export default Scan;
