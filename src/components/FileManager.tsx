import React, { useState, useEffect } from 'react';
import { TelegramClient, Api } from 'telegram';
import { useDropzone } from 'react-dropzone';
import Dexie from 'dexie';
import { useTranslation } from 'react-i18next';

// IndexedDB setup
const db = new Dexie('TgDriveDB');
db.version(1).stores({ files: '++id, name, type, size, date, chatId, messageId' });

interface FileMetadata {
  id?: number;
  name: string;
  type: string;
  size: number;
  date: Date;
  chatId: number;
  messageId: number | null;
}

interface Props {
  client: TelegramClient;
}

const FileManager: React.FC<Props> = ({ client }) => {
  const { t } = useTranslation();
  const [chats, setChats] = useState<Api.TypeChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Api.TypeChat | null>(null);
  const [targetChat, setTargetChat] = useState<Api.TypeChat | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const dialogs = await client.getDialogs({});
        const chatList = dialogs
          .filter((d) => d.isUser || d.isChannel || d.isGroup)
          .map((d) => d.entity as Api.TypeChat);
        setChats(chatList);
        if (chatList.length > 0) {
          setSelectedChat(chatList[0]); // Select first chat
        }
      } catch (err) {
        console.error('Load dialogs failed:', err);
      }

      const storedFiles = await db.table('files').toArray();
      setFiles(storedFiles);
    };

    loadData();
  }, [client]);

  const onDrop = async (acceptedFiles: File[]) => {
    if (!selectedChat) return;
    for (const file of acceptedFiles) {
      if (file.size > 2 * 1024 * 1024 * 1024) {
        console.warn('File too large:', file.name);
        continue;
      }
      try {
        const sentMessage = await client.sendFile(selectedChat, {
          file,
          caption: file.name, // optional
        });

        await db.table('files').add({
          name: file.name,
          type: file.type,
          size: file.size,
          date: new Date(),
          chatId: Number(selectedChat.id),
          messageId: sentMessage.id,
        });

        setFiles(await db.table('files').toArray());
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const downloadFile = async (fileMeta: FileMetadata) => {
    if (!fileMeta.messageId) return;
    try {
      const messages = await client.getMessages(fileMeta.chatId, { ids: [fileMeta.messageId] });
      const msg = messages[0];
      if (msg?.media) {
        const blob = await client.downloadMedia(msg.media, {});
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileMeta.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const forwardFile = async (fileMeta: FileMetadata) => {
    if (!fileMeta.messageId || !targetChat) return;
    try {
      await client.forwardMessages(targetChat, {
        messages: [fileMeta.messageId],
        fromPeer: fileMeta.chatId,
      });
      alert(t('forwardSuccess') || 'Đã forward thành công!');
    } catch (err) {
      console.error('Forward failed:', err);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const smartFolders = {
    images: filteredFiles.filter((f) => f.type.startsWith('image/')),
    videos: filteredFiles.filter((f) => f.type.startsWith('video/')),
    docs: filteredFiles.filter((f) => !f.type.startsWith('image/') && !f.type.startsWith('video/')),
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100">
      <div className="flex gap-4 mb-6">
        <select
          value={selectedChat?.id?.toString() ?? ''}
          onChange={(e) => {
            const id = Number(e.target.value);
            setSelectedChat(chats.find((c) => Number(c.id) === id) ?? null);
          }}
          className="p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">{t('selectStorage') || 'Chọn nơi lưu'}</option>
          {chats.map((chat) => (
            <option key={chat.id?.toString()} value={chat.id?.toString()}>
              {(chat as any).title || 'Saved Messages'}
            </option>
          ))}
        </select>

        <select
          value={targetChat?.id?.toString() ?? ''}
          onChange={(e) => {
            const id = Number(e.target.value);
            setTargetChat(chats.find((c) => Number(c.id) === id) ?? null);
          }}
          className="p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">{t('selectTarget') || 'Chọn nơi forward'}</option>
          {chats.map((chat) => (
            <option key={`t-${chat.id?.toString()}`} value={chat.id?.toString()}>
              {(chat as any).title || 'Saved Messages'}
            </option>
          ))}
        </select>
      </div>

      <div {...getRootProps()} className="border-2 border-dashed border-gray-400 dark:border-gray-600 p-8 my-6 text-center rounded-lg cursor-pointer hover:border-blue-500">
        <input {...getInputProps()} />
        <p className="text-lg">{t('dragDropHere') || 'Kéo thả file vào đây hoặc click để chọn'}</p>
      </div>

      <input
        type="text"
        placeholder={t('search') || 'Tìm kiếm file...'}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-3 mb-6 border rounded dark:bg-gray-800 dark:border-gray-700"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(smartFolders).map(([folder, items]) => (
          <div key={folder} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-3 capitalize">{folder}</h2>
            {items.length === 0 ? (
              <p className="text-gray-500">{t('noFiles') || 'Chưa có file'}</p>
            ) : (
              items.map((file) => (
                <div key={file.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                  <span className="truncate flex-1">{file.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadFile(file)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {t('download') || 'Tải'}
                    </button>
                    <button
                      onClick={() => forwardFile(file)}
                      disabled={!targetChat}
                      className={`px-3 py-1 rounded text-white ${targetChat ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                      {t('forward') || 'Forward'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileManager;