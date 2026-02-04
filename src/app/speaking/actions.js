'use server'

export async function getChannelVideos() {
  const API_KEY = process.env.YOUTUBE_API_KEY
  const CHANNEL_ID = 'UC2iUjubjzFe3nZfvry6sAdA'
  
  // Return mock data if no API key is present (for development/demo)
  if (!API_KEY) {
    console.warn('No YOUTUBE_API_KEY found, using mock data')
    return [
      {
        id: 'mock1',
        snippet: {
          title: 'Mastering Public Speaking in 2024',
          description: 'Learn the essential skills to become a confident public speaker in the modern age. We cover body language, voice control, and storytelling techniques that will captivate any audience.',
          publishedAt: '2024-01-15T10:00:00Z',
          thumbnails: {
            medium: { url: 'https://images.unsplash.com/photo-1475721027767-4d529c1e299c?w=800&q=80' }
          },
          resourceId: { videoId: 'mock_video_1' }
        }
      },
      {
        id: 'mock2',
        snippet: {
          title: 'The Art of Storytelling',
          description: 'Stories are the most powerful tool in communication. Discover how to craft compelling narratives that resonate with your listeners and leave a lasting impression.',
          publishedAt: '2024-01-20T14:30:00Z',
          thumbnails: {
            medium: { url: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=800&q=80' }
          },
          resourceId: { videoId: 'mock_video_2' }
        }
      },
      {
        id: 'mock3',
        snippet: {
          title: 'Overcoming Stage Fright',
          description: 'Fear of public speaking is common, but it doesn\'t have to hold you back. Learn practical strategies to manage anxiety and turn nervous energy into performative power.',
          publishedAt: '2024-02-05T09:15:00Z',
          thumbnails: {
            medium: { url: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&q=80' }
          },
          resourceId: { videoId: 'mock_video_3' }
        }
      },
      {
        id: 'mock4',
        snippet: {
          title: 'Body Language Secrets',
          description: 'Your non-verbal cues say more than your words. Unlock the secrets of effective body language to project confidence and authority in any situation.',
          publishedAt: '2024-02-12T16:45:00Z',
          thumbnails: {
            medium: { url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&q=80' }
          },
          resourceId: { videoId: 'mock_video_4' }
        }
      },
       {
        id: 'mock5',
        snippet: {
          title: 'Voice Control Mastery',
          description: 'How you say it matters just as much as what you say. master your tone, pitch, and pace to keep your audience engaged from start to finish.',
          publishedAt: '2024-02-20T11:00:00Z',
          thumbnails: {
            medium: { url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&q=80' }
          },
          resourceId: { videoId: 'mock_video_5' }
        }
      }
    ]
  }

  try {
    // 1. Get latest video IDs from Search
    // Fetch 50 items (max) to increase chance of finding enough long videos
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=id&order=date&maxResults=50&type=video`,
      { next: { revalidate: 3600 } }
    )
    
    const searchData = await searchRes.json()
    
    if (!searchData.items || searchData.items.length === 0) {
      console.error('YouTube Search API Error or Empty:', searchData)
      return []
    }

    const videoIds = searchData.items.map(item => item.id.videoId).join(',')

    // 2. Get Video Details
    const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&part=snippet,contentDetails&id=${videoIds}`,
         { next: { revalidate: 3600 } }
    )
    const videosData = await videosRes.json()
    
    if (!videosData.items) return []

    // 3. Filter out Shorts/Clips (duration < 2 minutes / 120 seconds)
    const longVideos = videosData.items.filter(video => {
        const durationStr = video.contentDetails?.duration || '';
        if (!durationStr) return false;

        // Parse ISO 8601 duration (PT#H#M#S)
        const match = durationStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return false;

        const hours = (parseInt(match[1]) || 0);
        const minutes = (parseInt(match[2]) || 0);
        const seconds = (parseInt(match[3]) || 0);
        
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
        
        return totalSeconds >= 120; // 2 minutes
    });

    return longVideos.slice(0, 10) // Still limit strictly to top 10 long videos

  } catch (error) {
    console.error('Failed to fetch YouTube videos:', error)
    return []
  }
}
