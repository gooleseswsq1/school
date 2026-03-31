'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Loader, AlertCircle, RefreshCw, Sparkles, Lock, Calendar, CheckCircle } from 'lucide-react';

interface ActivationCode {
  id: string;
  code: string;
  isUsed: boolean;
  usedBy?: string;
  createdAt: string;
  expiresAt: string;
}

export default function CodeGenerationPanel() {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Fetch codes on mount
  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setIsLoadingCodes(true);
    try {
      const response = await fetch('/api/admin/codes');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Không thể tải danh sách mã');
      }
      setCodes(result.codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải danh sách');
    } finally {
      setIsLoadingCodes(false);
    }
  };

  const generateCode = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Không thể tạo mã');
      }

      setGeneratedCode(result.code);
      setSuccess(`Tạo mã thành công!`);
      setCopiedCode('');
      fetchCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo mã');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setError('');
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch {
      setError('Không thể sao chép mã. Vui lòng copy thủ công.');
    }
  };

  const copyGeneratedCode = () => {
    if (generatedCode) {
      copyCode(generatedCode);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const daysUntilExpire = (expiresAt: string) => {
    const now = new Date();
    const expireDate = new Date(expiresAt);
    const diffTime = expireDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const unusedCodesCount = codes.filter(c => !c.isUsed).length;
  const usedCodesCount = codes.filter(c => c.isUsed).length;

  return (
    <div className="space-y-8">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Tổng mã</p>
              <p className="text-3xl font-bold">{codes.length}</p>
            </div>
            <Lock className="w-12 h-12 opacity-20" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Chưa sử dụng</p>
              <p className="text-3xl font-bold">{unusedCodesCount}</p>
            </div>
            <CheckCircle className="w-12 h-12 opacity-20" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">Đã dùng</p>
              <p className="text-3xl font-bold">{usedCodesCount}</p>
            </div>
            <CheckCircle className="w-12 h-12 opacity-20" />
          </div>
        </div>
      </div>

      {/* Main Create Code Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8 md:p-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Tạo mã kích hoạt
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Tạo mã để học sinh có thể đăng ký tài khoản và truy cập khóa học
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message with Generated Code */}
          {success && generatedCode && (
            <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-700 dark:text-green-400 font-semibold mb-4 flex items-center gap-2">
                <Check className="w-5 h-5" />
                {success}
              </p>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center justify-between border-2 border-green-200 dark:border-green-800">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mã kích hoạt:</p>
                  <code className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-cyan-400 font-mono tracking-widest">
                    {generatedCode}
                  </code>
                </div>
                <button
                  onClick={copyGeneratedCode}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                    copiedCode === generatedCode
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {copiedCode === generatedCode ? (
                    <>
                      <Check className="w-4 h-4" />
                      Đã sao chép
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Sao chép
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={generateCode}
            disabled={isLoading}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Đang tạo mã...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Tạo mã kích hoạt
              </>
            )}
          </button>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>💡 Thông tin:</strong> Mỗi mã có hiệu lực 30 ngày và chỉ có thể sử dụng 1 lần. Sau khi học sinh dùng mã, tài khoản sẽ được kích hoạt tự động.
            </p>
          </div>
        </div>
      </div>

      {/* Codes List Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Danh sách mã kích hoạt
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              {codes.length} mã đã tạo
            </p>
          </div>
          <button
            onClick={fetchCodes}
            disabled={isLoadingCodes}
            className="p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoadingCodes ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        {isLoadingCodes ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16">
            <Lock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Chưa có mã kích hoạt nào. Hãy tạo mã mới bên trên.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-slate-700">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Mã kích hoạt
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Trạng thái
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Thời hạn
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code, index) => {
                  const daysLeft = daysUntilExpire(code.expiresAt);
                  const isExpiring = daysLeft <= 7;
                  const isExpired = daysLeft <= 0;

                  return (
                    <tr
                      key={code.id}
                      className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <code className="bg-gray-100 dark:bg-slate-700 px-4 py-2 rounded-lg text-blue-600 dark:text-cyan-400 font-mono font-bold text-sm">
                            {code.code}
                          </code>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                            code.isUsed
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full mr-2 bg-current" />
                          {code.isUsed ? 'Đã sử dụng' : 'Chưa dùng'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Calendar className={`w-4 h-4 ${isExpired ? 'text-red-500' : isExpiring ? 'text-yellow-500' : 'text-gray-400'}`} />
                          <span className={`text-sm font-medium ${isExpired ? 'text-red-600 dark:text-red-400' : isExpiring ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>
                            {isExpired ? (
                              <span>Hết hạn</span>
                            ) : (
                              <>Còn {daysLeft} ngày</>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => copyCode(code.code)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
                        >
                          {copiedCode === code.code ? (
                            <>
                              <Check className="w-4 h-4" />
                              Đã sao chép
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Sao chép
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
