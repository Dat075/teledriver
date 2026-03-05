import React, { useState, useEffect } from 'react';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

const API_ID = 24640384; // Thay bằng của bạn nếu cần
const API_HASH = 'e68f1d53901b397d581861c7a8b30f74'; // Thay bằng của bạn

interface Props {
  onLogin: (client: TelegramClient) => void;
}

function uint8ToBase64Url(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  const base64 = window.btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const session = new StringSession(localStorage.getItem('tg_session') || '');
    const client = new TelegramClient(session, API_ID, API_HASH, {
      connectionRetries: 5,
    });

    client.start({
      phoneNumber: async () => '',
      password: async () => '',
      phoneCode: async () => '',
      onError: (err: any) => {
        if (mounted) setError(err?.message || 'Unknown error');
      },
      qrCode: async (qr: any) => {
        try {
          let tokenBase64: string;
          if (qr.token instanceof Uint8Array) {
            tokenBase64 = uint8ToBase64Url(qr.token);
          } else if (typeof qr.token === 'string') {
            tokenBase64 = qr.token;
          } else {
            throw new Error('Invalid QR token format');
          }
          if (mounted) setQrUrl(`tg://login?token=${tokenBase64}`);
        } catch (e: any) {
          if (mounted) setError(e?.message || 'QR generation failed');
        }
      },
    })
      .then(() => {
        client.session.save();
        const sessionStr = client.session.toString();
        if (sessionStr) localStorage.setItem('tg_session', sessionStr);
        if (mounted) onLogin(client);
      })
      .catch((e: any) => {
        if (mounted) setError(e?.message || 'Login failed');
      });

    return () => {
      mounted = false;
      client.destroy().catch(() => {});
    };
  }, [onLogin]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {qrUrl ? (
        <>
          <QRCode value={qrUrl} size={256} />
          <p className="mt-4 text-lg font-medium">{t('scanQrToLogin') || 'Quét mã QR bằng ứng dụng Telegram'}</p>
        </>
      ) : error ? (
        <p className="text-red-500 text-center max-w-md">{error}</p>
      ) : (
        <p className="text-lg">{t('generatingQr') || 'Đang tạo mã QR...'}</p>
      )}
    </div>
  );
};

export default Login;