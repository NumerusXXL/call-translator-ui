'use client';
import React, {useEffect, useState} from 'react';
import { useRouter } from 'next/navigation';
import './page.css';
import { Button } from '@nextui-org/button'
import { Input } from '@nextui-org/input'
import { createRoom } from '@/app/utils/utils';



const VideoChat = () => {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [room, setRoom] = useState<{ roomId: string; roomName: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const room = await createRoom(roomName);
      if (room) {
        router.push(`/call/${room.roomId}/${room.roomName}/checkpoint`);
      } else {
        console.error('Failed to create room');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (

    <main>

      <div className="container flex h-screen items-center justify-center">

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <Input

            type="text"

            placeholder="Enter Room Name"

            value={roomName}

            onChange={(e) => setRoomName(e.target.value)}

            required

          />

          <Button type="submit" disabled={isSubmitting || !roomName}>

            {isSubmitting ? 'Creating...' : 'Create'}

          </Button>

        </form>

      </div>

    </main>

  );
};
export default VideoChat;