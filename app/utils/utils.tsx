import dotenv from 'dotenv';
import axios from "axios";
import {Card} from '@nextui-org/card';
import Image from 'next/image';
import React from "react";
import profilePic from '@/app/images/profile.png';
import translationStyles from '../call/[roomId]/[roomName]/room/TranslationCard.module.css'

dotenv.config();

//This is utils.ts
// const serverURL = "https://nameless-inlet-92930-bb88adb4f773.herokuapp.com/";
const serverURL = 'https://call-translator-27d21e073e70.herokuapp.com/'
export let speaking = false
class Queue {
    private items: any[];
    constructor() {
        this.items = [];
    }
    enqueue(element: any) {
        this.items.push(element);
    }
    dequeue() {
        if (this.isEmpty()) {
            return "Underflow";
        }
        return this.items.shift();
    }
    front() {
        if (this.isEmpty()) {
            return "No elements in Queue";
        }
        return this.items[0];
    }
    isEmpty() {
        return this.items.length === 0;
    }
    size() {
        return this.items.length;
    }
    printQueue() {
        let str = "";
        for (let i = 0; i < this.items.length; i++) {
            str += this.items[i] + " ";
        }
        return str;
    }
}

export const ttsQueue = new Queue()

export const createRoom = async (roomName: string): Promise<{ roomId: string; roomName: string } | null> => {
  try {
    const response = await fetch(`${serverURL}create_room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'room_name': roomName,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    return {
      roomId: data.room_id,
      roomName: data.room_name
    };
  } catch (error) {
    console.error('Error creating room:', error);
    return null;
  }
};


export const getLanguagesArray = async () => {
    const response = await fetch(`${serverURL}/languages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }})
    if (!response.ok) {
      throw new Error('Failed to load languages list');
    }

    const data = await response.json();
    return data.names.map((obj: {}) => Object.keys(obj)[0])
}

export const decode = (value: string | null | string[]) => {
  if (Array.isArray(value)) {
    return '';
  }
  return value ? decodeURIComponent(value) : '';
};

export function makeVideoElement(elementId: string, displayName: string): HTMLDivElement {
  const wrapperDiv = document.createElement("div");
  const vidWrapper = document.createElement("div");
  const vid = document.createElement("video");
  const nameText = document.createElement("h1");

  wrapperDiv.id = `div_${elementId}`;
  vid.id = `vid_${elementId}`;
  vid.className = "remoteVideo rounded-lg shadow-md border border-gray-300 transition-shadow duration-500 ease-in-out";
  wrapperDiv.className = "remoteVideo video-item";
  vidWrapper.className = "vid-wrapper";
  vidWrapper.id = `vidwr_${elementId}`;
  nameText.className = "display-name";
  wrapperDiv.style.backgroundColor = "rgba(102, 177, 244, 0)";
  vidWrapper.style.backgroundColor = "rgba(255, 255, 255, 0)";
  vid.autoplay = true;
  nameText.innerText = displayName;

  vidWrapper.appendChild(vid);
  wrapperDiv.appendChild(vidWrapper);
  wrapperDiv.appendChild(nameText);

  return wrapperDiv;
}

export function addVideoElement(elementId: string, displayName: string): void {
  removeVideoElement(elementId);
  const videoGrid = document.getElementById("video_grid");
  if (videoGrid) {
    videoGrid.appendChild(makeVideoElement(elementId, displayName));
    // getParticipantsWithOtherLanguages();
  }
}

export function removeVideoElement(elementId: string): void {
  const div = document.getElementById(`div_${elementId}`);
  if (!div) {
    console.log("Video element not found");
    return;
  }

  const vid = getVideoObj(elementId);
  if (vid) {
    if (vid.srcObject) {
      const tracks = (vid.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    vid.removeAttribute("srcObject");
    vid.removeAttribute("src");
  }

  div.remove();
}

export function getVideoObj(elementId: string): HTMLVideoElement | null {
  return document.getElementById(`vid_${elementId}`) as HTMLVideoElement | null;
}


export const dragAndDrop = (element: any) => {
    const elementContainer = element.current;
    if (elementContainer) {
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragStartLeft = 0;
        let dragStartTop = 0;

        const handleDragStart = (event: MouseEvent) => {
            isDragging = true;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            dragStartLeft = elementContainer.offsetLeft;
            dragStartTop = elementContainer.offsetTop;
        };

        const handleDragMove = (event: MouseEvent) => {
            if (!isDragging) return;
            const deltaX = event.clientX - dragStartX;
            const deltaY = event.clientY - dragStartY;
            elementContainer.style.left = `${dragStartLeft + deltaX}px`;
            elementContainer.style.top = `${dragStartTop + deltaY}px`;
        };

        const handleDragEnd = () => {
            isDragging = false;
        };

        elementContainer.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);

        return () => {
            elementContainer.removeEventListener('mousedown', handleDragStart);
            document.removeEventListener('mousemove', handleDragMove);
            document.removeEventListener('mouseup', handleDragEnd);
        };
    }
}


let uuidv4 = () => {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (match) => {
    const value = parseInt(match, 16);
    const random = crypto.getRandomValues(new Uint8Array(1))[0] & 0x0f;
    const result = (value ^ random) & 0x0f;
    return result.toString(16);
  });
};

export const generateAndSavePermanentId = () => {
  const permanentId = localStorage.getItem('permanent_id');

  if (permanentId) {
    return permanentId
  } else {
    const newPermanentId = uuidv4();
    localStorage.setItem('permanent_id', newPermanentId);
    return newPermanentId
  }
};


export const addMessage = (local: boolean, username: string, original_text: string, id: string) => {
    let messageDiv = document.createElement('div');
    messageDiv.classList.add(local ? 'localMessageBox' : 'remoteMessageBox');
    let senderDiv = document.createElement('strong');
    // senderDiv.classList.add(local ? 'localMessageSender' : 'remoteMessageSender');
    senderDiv.innerText = username;

    let textDiv = document.createElement('div');
    textDiv.classList.add(local ? 'localMessage' : 'remoteMessage');
    textDiv.id = 'mess_' + id
    let originalLabel = document.createElement('strong');
    // originalLabel.innerText = 'Original: ';
    let originalText = document.createElement('span')
    originalText.id = 'orig_' + id
    originalText.innerText = original_text
    let translatedLabel = document.createElement('strong');
    translatedLabel.innerText = 'Translated: ';
    if (!local) {
        textDiv.appendChild(senderDiv);
        textDiv.appendChild(document.createElement('br'));

    }
    // if (!local && false) {
    //     textDiv.appendChild(document.createElement('br'));
    //     textDiv.appendChild(originalLabel);
    // }
    textDiv.appendChild(originalText);
    if (!local) {
        textDiv.appendChild(document.createElement('br'));
        textDiv.appendChild(translatedLabel);
    }

    messageDiv.appendChild(textDiv);
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) {
      return
    }
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

export const appendMessage = (local: boolean, id: string, text: string, original: string, type: string, username: string) => {
    // console.log(id)
    if (original) {
        const textElement = document.getElementById('orig_' + id)
        if (textElement) {
            textElement.innerText = text
        } else {
            addMessage(local, username, text, id)
        }
    } else {
        let textElement = document.getElementById('trans_' + id)
        if (textElement !== null) {
            // textElement.innerText = textElement.innerText + text
            textElement.innerText += ' ' + text

        } else {
            const message = document.getElementById('mess_' + id)
            let translatedText = document.createElement('span')
            translatedText.id = 'trans_' + id
            translatedText.innerText = text
            if (message) {
                message.appendChild(translatedText)
            }
        }
    }
    const messagesDiv = document.getElementById('messages');
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
}

export const playAudio = async (audioBytes: ArrayBuffer) => {
    try {
        speaking = true;
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(audioBytes);

        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioContext.destination);

        sourceNode.onended = () => {
            speaking = false;
            sourceNode.disconnect();
            audioContext.close();

            if (ttsQueue.size() > 0) {
                const nextAudio = ttsQueue.dequeue();
                playAudio(nextAudio);
            }
        };

        sourceNode.start(0);
    } catch (error) {
        console.error('Error decoding or playing audio:', error);
        speaking = false;
        ttsQueue.dequeue();
    }
};

export const fetchAndDownloadChatHistory = async (roomId: string, userId: string): Promise<boolean | null> => {
  try {
    const response = await axios.get(`${serverURL}/get_chat_history`, {
      params: {
        room_id: roomId,
        user_id: userId,
      },
      responseType: 'text',
    });

    downloadChatHistory(response.data, 'chat_history.txt')
    return true
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return null;
  }
};

export const downloadChatHistory = (chatHistory: string, fileName: string) => {
      const element = document.createElement('a');
      const file = new Blob([chatHistory], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = fileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
};



export const showTranslation = (name: string, text: string) => {
    return (
        <div className="bg-black bottom-0" style={{borderRadius: '15px'}}>
            <div className="flex items-center" style={{ minHeight: '5vh' }}>
                <Image className='ml-5' src={profilePic} alt="Profile picture" style={{ width: '37px', height: '37px', borderRadius: '37px'}}
                />
                <p style={{padding: '20px 20px 20px 20px'}}>
                    {text}
                </p>
            </div>
        </div>
    );
};

export const createChatBG = () => {
    if (document.getElementById('bgDiv')) {
        return
    }
    const backgroundDiv = document.createElement('div');
    backgroundDiv.className = 'absolute bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex justify-center'
    backgroundDiv.classList.add(translationStyles.backgroundDiv);
    backgroundDiv.id = 'bgDiv'
    document.body.appendChild(backgroundDiv);
}