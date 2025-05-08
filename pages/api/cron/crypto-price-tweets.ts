import type { NextApiRequest, NextApiResponse } from 'next'
import { TwitterApi, TweetV2PostTweetResult } from 'twitter-api-v2'

const cronSecret = process.env.CRON_SECRET

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Twitter test started at:', new Date().toISOString())

  // Check for authentication
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    console.error('Authentication failed')
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const tweet = `🚨 Test Tweet 🚨\n\nThis is a test tweet from the API.\n\n${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`

    // Check Twitter credentials
    const requiredEnvVars = [
      'TWITTER_API_KEY',
      'TWITTER_API_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_ACCESS_TOKEN_SECRET'
    ] as const

    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key])
    let tweetResponse: TweetV2PostTweetResult | null = null

    // Only try to post to Twitter if all credentials are available
    if (missingEnvVars.length === 0) {
      try {
        const twitterClient = new TwitterApi({
          appKey: process.env.TWITTER_API_KEY!,
          appSecret: process.env.TWITTER_API_SECRET!,
          accessToken: process.env.TWITTER_ACCESS_TOKEN!,
          accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
        })
        tweetResponse = await twitterClient.v2.tweet(tweet)
        console.log('Tweet posted successfully:', tweetResponse)
      } catch (twitterError) {
        console.error('Failed to post tweet:', twitterError)
      }
    } else {
      console.log('Twitter credentials not available, skipping tweet. Missing:', missingEnvVars.join(', '))
    }

    return res.status(200).json({
      message: tweetResponse ? 'Test tweet posted successfully' : 'Twitter posting skipped (missing credentials)',
      tweet,
      tweetResponse: tweetResponse || null
    })

  } catch (error) {
    console.error('Error in twitter test:', error)
    return res.status(500).json({ message: 'Failed to run twitter test', error: error.message })
  }
} 