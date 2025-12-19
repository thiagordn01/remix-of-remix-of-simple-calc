import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { GeminiApiKey } from '../types/scripts';

interface ApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: Omit<GeminiApiKey, 'id' | 'createdAt'>) => void;
  apiKey?: GeminiApiKey;
  title: string;
}

export const ApiModal: React.FC<ApiModalProps> = ({
  isOpen,
  onClose,
  onSave,
  apiKey,
  title
}) => {
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    model: 'gemini-3-flash-preview'
  });
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (apiKey) {
      setFormData({
        name: apiKey.name,
        key: apiKey.key,
        model: apiKey.model
      });
    } else {
      setFormData({
        name: '',
        key: '',
        model: 'gemini-3-flash-preview'
      });
    }
  }, [apiKey, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.key.trim()) {
      alert('Por favor, insira uma chave de API válida');
      return;
    }
    
    onSave({
      ...formData,
      name: formData.name || `API ${Date.now()}`,
      model: formData.model as 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-3-flash-preview',
      status: 'unknown' as const,
      lastUsed: null,
      requestCount: 0,
      isActive: true
    });
    onClose();
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome da API
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: API Principal"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Chave da API *
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={formData.key}
                onChange={(e) => handleInputChange('key', e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="AIzaSy..."
                required
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Modelo
            </label>
            <select
              value={formData.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gemini-3-flash-preview">gemini-3-flash-preview (Recomendado)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {apiKey ? 'Salvar Alterações' : 'Adicionar API'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
