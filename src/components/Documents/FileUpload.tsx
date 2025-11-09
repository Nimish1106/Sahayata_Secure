import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { apiUploadFile } from '../../lib/api';
import toast from 'react-hot-toast';

interface FileUploadProps {
  projectId: string;
  onUploadComplete: () => void;
  onClose: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ projectId, onUploadComplete, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({});
  const [tags, setTags] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDescriptionChange = (fileName: string, description: string) => {
    setDescriptions(prev => ({ ...prev, [fileName]: description }));
  };

  const handleTagsChange = (fileName: string, tagString: string) => {
    setTags(prev => ({ ...prev, [fileName]: tagString }));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const description = descriptions[file.name] || '';
        const tagArray = tags[file.name] ? tags[file.name].split(',').map(t => t.trim()).filter(t => t) : [];
        
  await apiUploadFile(file, projectId, description, tagArray);
        successCount++;
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
      onUploadComplete();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close upload dialog"
            title="Close upload dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {files.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Files</h3>
              <p className="text-gray-600">Click to select files or drag and drop</p>
              <p className="text-sm text-gray-500 mt-2">Supports all document types up to 50MB</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Selected Files ({files.length})</h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Add More Files
                </button>
              </div>

              {files.map((file, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">{file.name}</h4>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      aria-label={`Remove ${file.name}`}
                      title={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        value={descriptions[file.name] || ''}
                        onChange={(e) => handleDescriptionChange(file.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="Brief description of this document..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags (optional)
                      </label>
                      <input
                        type="text"
                        value={tags[file.name] || ''}
                        onChange={(e) => handleTagsChange(file.name, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., urgent, report, beneficiary-data (comma-separated)"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png"
            aria-label="Select files to upload"
            title="Select files to upload"
          />
        </div>

        {files.length > 0 && (
          <div className="border-t border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>Files will be securely encrypted and stored</span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};