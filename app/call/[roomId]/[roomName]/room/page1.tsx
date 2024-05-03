'use client'

//page.tsx

import React, {useEffect, useRef, useState} from 'react';
import {
  Button,
  Card,
  CardBody,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tooltip,
  useDisclosure
} from '@nextui-org/react';
import {useParams, useRouter, useSearchParams} from 'next/navigation';
import io from 'socket.io-client';
import VideocamIcon from '@mui/icons-material/Videocam';
import MicIcon from '@mui/icons-material/Mic';
import CallEndRoundedIcon from '@mui/icons-material/CallEndRounded';
import AddLinkIcon from '@mui/icons-material/AddLink';
import SpeakerNotesIcon from '@mui/icons-material/SpeakerNotes';
import SpeakerNotesOffIcon from '@mui/icons-material/SpeakerNotesOff';
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded';
import {changeStateMR, initMediaRecorder, mediaRecorder, setMediaRecorderUndefined} from '@/utils/translation';
import {
  appendMessage,
  decode,
  dragAndDrop,
  fetchAndDownloadChatHistory,
  generateAndSavePermanentId,
  playAudio,
  speaking,
  ttsQueue
} from '@/utils/utils';
import {
  myID,
  onConnect,
  onData,
  onUserConnect,
  onUserDisconnected,
  onUserList, start_webrtc,
  updateAudioTracks,
  updateVideoTracks,
} from '@/utils/socketNetworkHandlers';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';

// const socket = io('https://nameless-inlet-92930-bb88adb4f773.herokuapp.com', { autoConnect: false });
const socket = io('https://call-translator-27d21e073e70.herokuapp.com', { autoConnect: false });

const constraints: MediaStreamConstraints = {
  audio: {
    sampleRate: 48000,
    sampleSize: 16,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: true
};

const VideoChat = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayName = decode(searchParams.get('displayName'));
  const muteAudio = searchParams.get('audioMuted') === 'true';
  const muteVideo = searchParams.get('videoMuted') === 'true';
  // const muteAudio = true
  // const muteVideo = true
  const language = searchParams.get('language');
  const videoRef = useRef<HTMLVideoElement>(null);
  let { roomId, roomName } = useParams();
  if (Array.isArray(roomId)) {
    roomId = roomId[0];
  }
  roomName = decode(roomName);
  const [audioMuted, setAudioMuted] = useState<boolean>(muteAudio);
  const [videoMuted, setVideoMuted] = useState<boolean>(muteVideo);
  const [showChat, setShowChat] = useState<boolean>(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [stream, setStream] = useState<any>(null);
  const DEBUG_TEST_MESSAGES = false;
  const {isOpen, onOpen, onOpenChange} = useDisclosure();
  // const [isMounted, setIsMounted] = useState<boolean>(true)
  const isMounted = useRef(true);
  const permanentId = generateAndSavePermanentId();

const toggleAudio = () => {
  setAudioMuted(!audioMuted);
  setAudioMuteState();
};

const toggleVideo = () => {
  setVideoMuted(!videoMuted);
  setVideoMuteState();
};

const setAudioMuteState = async () => {
  if (!videoRef.current || !(videoRef.current.srcObject instanceof MediaStream)) {
    return;
  }

  const audioTracks = videoRef.current.srcObject.getAudioTracks();

  if (!audioMuted) {
    audioTracks.forEach((track) => {
      track.enabled = false;
      // track.stop()
    });
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
    setMediaRecorderUndefined();
  } else {
    const stream = await startLocalAudio() as MediaStream
    updateAudioTracks(stream)
    if (videoRef.current) {
      initMediaRecorder(videoRef.current.srcObject, socket, roomId, permanentId, !audioMuted);
    }
  }
};

const setVideoMuteState = async () => {
  if (!videoRef.current || !(videoRef.current.srcObject instanceof MediaStream)) {
    return;
  }

  const videoTracks = videoRef.current.srcObject.getVideoTracks();

  if (!videoMuted) {
    videoTracks.forEach((track) => {
      track.enabled = false;
      setTimeout( () => {
        // track.stop()
      }, 500)
    });
  } else if (videoMuted) {
    const stream = await startLocalVideo() as MediaStream;
    updateVideoTracks(stream);
  }
};

const startLocalVideo = async () => {
  try {
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: constraints.video, audio: false });
    const newVideoTracks = videoStream.getVideoTracks();

    if (videoRef.current) {
      const currentStream = videoRef.current.srcObject as MediaStream;
      const oldVideoTracks = currentStream.getVideoTracks();

      oldVideoTracks.forEach((track) => {
        currentStream.removeTrack(track);
        track.stop();
      });

      newVideoTracks.forEach((track) => {
        currentStream.addTrack(track);
      });
    }

    return videoStream;
  } catch (error) {
    console.error('Error accessing video device:', error);
    return null;
  }
};

const startLocalAudio = async () => {
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: constraints.audio, video: false });
    const newAudioTracks = audioStream.getAudioTracks();

    if (videoRef.current) {
      const currentStream = videoRef.current.srcObject as MediaStream;
      const oldAudioTracks = currentStream.getAudioTracks();

      oldAudioTracks.forEach((track) => {
        currentStream.removeTrack(track);
        track.stop();
      });

      newAudioTracks.forEach((track) => {
        currentStream.addTrack(track);
      });
    }

    return audioStream;
  } catch (error) {
    console.error('Error accessing audio device:', error);
    return null;
  }
};


const [linkCopied, setLinkCopied] = useState(false);

const copyLink = () => {
  const { protocol, host, pathname } = window.location;
  const roomID = pathname.split('/')[2];
  const displayedRoomName = pathname.split('/')[3];
  const checkpointLink = `${protocol}//${host}/call/${roomID}/${displayedRoomName}/checkpoint/`;
  navigator.clipboard.writeText(checkpointLink)
    .then(() => setLinkCopied(true))
    .catch((err) => console.error('Failed to copy link:', err));
  setTimeout(() => {
    setLinkCopied(false);
  }, 2000);
};

const toggleChat = () => {
    const makeVideoSmall = () => {
      if (videoContainerRef.current) {
        videoContainerRef.current.classList.remove('w-[97vw]');
        videoContainerRef.current.classList.add('w-2/3');
      }
    };

    const makeVideoBig = () => {
      if (videoContainerRef.current) {
        videoContainerRef.current.classList.remove('w-2/3');
        videoContainerRef.current.classList.add('w-[97vw]');
      }
    };

    setShowChat(!showChat);

    if (!showChat) {
      makeVideoSmall();
    } else {
      makeVideoBig();
    }
  };


  const endCall = () => {
    setVideoMuted(true);
    setAudioMuted(true);
    onOpen();
  };

  const downloadChatHistory = () => {
    if (Array.isArray(roomId)) {
      roomId = roomId[0]
    }
    fetchAndDownloadChatHistory(roomId, myID)
  };


  const startLocalStream = async () => {
    try {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
        audio: constraints.audio,
        video: true
      } )

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      return null;
    }
  };

  useEffect(() => {
    if (isMounted.current) {
      isMounted.current = false
      startLocalStream().then( (stream) => {
        if (stream) {
          const videoTracks = stream.getVideoTracks();
          const audioTracks = stream.getAudioTracks()
          if (videoMuted) {
            console.log(videoTracks)
            videoTracks.forEach((track) => {
              track.enabled = false;
              setTimeout(() => {
                // track.stop()
              }, 1000)
            });
          }
          if (audioMuted) {
            audioTracks.forEach((track) => {
              track.enabled = false;
            });
          } else {
          }
        }
      })
      dragAndDrop(localVideoRef);
      dragAndDrop(messagesRef);
      setTimeout( () => {
        socket.connect()
        socket.on('connect', () => {
          console.log('CONNECTED')
          console.log('connected media recorder')
          if (videoRef.current) {
            initMediaRecorder(videoRef.current.srcObject as MediaStream, socket, roomId, permanentId, false)
          }
        })
      }, 1000)
      socket.on('connect', () => {
        onConnect(socket, roomId, roomName, displayName, language);
      });

      socket.on('user-connect', (data: any) => {
        onUserConnect(data);
      });

      socket.on('user-disconnect', (data: any) => {
        onUserDisconnected(data);
      });

      socket.on('user-list', (data: any) => {
        onUserList(data, socket, videoRef.current);
      });

      socket.on('data', (msg: any) => {
        onData(msg, socket, videoRef.current);
      });

      socket.on('test', async (data: any) => {
        if (DEBUG_TEST_MESSAGES) {
          console.log('TEST MESSAGE RECEIVED');
          if (data.message) {
            console.log('TEXT', data.message);
          }
        }
      });
      socket.on('new_message', async (data: any) => {
        appendMessage(data.local, data.id, data.text, data.original, data.type, data.name)
        if (!data.original){
          const audioBytes = data.audio
          if (speaking) {
              ttsQueue.enqueue(audioBytes)
          }
          else {
              await playAudio(audioBytes)
          }
        }
      })
    }

  }, []);





  return (
    <div className="w-full h-full flex m-4 flex-col">
      {/* Main Content */}
      <div className="flex flex-1">
        {/* Video Grid */}
        <div ref={videoContainerRef} id="video_container" className="w-[97vw] p-4">
          <div
            id="video_grid_container"
            className="w-full h-full rounded-lg shadow-md overflow-hidden"
          >
            <div
              id="video_grid"
              className="video-grid h-full w-full grid gap-4 justify-items-center items-center p-4"
            >
              {/* Remote Video Containers */}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="w-1/3 p-4" style={{ display: showChat ? 'block' : 'none' }}>
          <Card className="h-full rounded-lg shadow-md">
            <CardBody className="p-0">
              <div className="chat h-full flex flex-col">
              <div
                className="messages flex-1 p-4 overflow-y-auto"
                style={{ maxHeight: '82vh' }}
                id="messages"
              >
                  {/* Chat messages */}
                </div>
                <div className="input-container p-4">
                  {/* Chat input */}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex justify-between items-center w-full p-4">
        <div className="w-1/5 flex justify-left items-left space-x-4">
          {/* Top Bar */}
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center space-x-2">
              <h1 className='text-2xl font-semibold'>{roomName}</h1>
            </div>
          </div>
        </div>
        <div className="w-1/5 flex justify-center items-center space-x-4">
        <Tooltip color="primary" content="Copy Room-Link" delay={250}>
          <Button
            size="sm"
            isIconOnly
            onClick={copyLink}
            className="light: bg-white text-black rounded-lg shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            <AddLinkIcon />
          </Button>
          </Tooltip>
          <Tooltip color="primary" content="Real Time Chat Transcription" delay={250}>
          <Button
            size="sm"
            isIconOnly
            onClick={toggleChat}
            className="bg-white text-black rounded-lg shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            {showChat ? <SpeakerNotesIcon fontSize="small" /> : <SpeakerNotesOffIcon fontSize="small" />}
          </Button>
          </Tooltip>
          <Tooltip color="primary" content="Download Chat Transcription" delay={250}>
          <Button
            size="sm"
            isIconOnly
            onClick={downloadChatHistory}
            className="bg-white text-black rounded-lg shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            <FileDownloadRoundedIcon />
          </Button>
          </Tooltip>
        </div>

        <div className="w-1/5 flex justify-center items-center space-x-4">
          <Button
            onClick={toggleAudio}
            className="bg-white text-black rounded-full shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            {audioMuted ? <MicOffIcon /> : <MicIcon />}
          </Button>
          <Button
            onClick={toggleVideo}
            className="bg-white text-black rounded-full shadow-md  dark:bg-gray-800 text-white hover:bg-gray-100 transition-colors duration-300"
          >
            {videoMuted ? <VideocamOffIcon /> : <VideocamIcon />}
          </Button>
          <Button
            className="bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors duration-300"
            onClick={endCall}
          >
            <CallEndRoundedIcon />
          </Button>
        </div>
        <div className="w-1/5 flex justify-center items-center space-x-4"></div>
        <div className="w-1/5 flex justify-center items-center space-x-4">
          <div
            ref={localVideoRef}
            id="local_vid_container"
            className="local-video-container rounded-lg shadow-md overflow-hidden"
          >
            <video
              ref={videoRef}
              id="local_vid"
              autoPlay
              muted
              className="local-video w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">End Call</ModalHeader>
              <ModalBody>
                <p>Would you like to download the Voice Transcription before ending the call?</p>
              </ModalBody>
              <ModalFooter>
                <div className='w-full h-full flex justify-between items-center p-0'>
                <div className='w-2/5 justify-start items-start'>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                </div>
                <div className='w-3/5 justify-end items-end'>
                <Button
                  color="danger"
                  onPress={() => {
                    onClose();
                    router.push("/start");
                  }}
                >
                  Just End the Call
                </Button>
                <Button color="success" variant="solid" onPress={onClose} className='mx-1' onClick={downloadChatHistory}>
                  Yes
                </Button>
                </div>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      {linkCopied && (
        <a></a>
//   <Zoom in={linkCopied}>
//     <Notification isVisible>
//       <div className='w-full flex justify-center items-center space-x-4'>
//         <div className='w-1/12 flex justify-center items-center'>
//           <LinkRoundedIcon />
//         </div>
//         <div className='w-11/12 flex justify-center items-center'>
//           <p>Link Copied Successfully</p>
//         </div>
//       </div>
//     </Notification>
//   </Zoom>
      )}
    </div>
  );
};

export default VideoChat;