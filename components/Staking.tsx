'use client'

import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export function MaxiStaking() {
  const [amount, setAmount] = useState('')
  const [stakedAmount, setStakedAmount] = useState(0)
  const [error, setError] = useState('')

  const handleStake = () => {
    const stakeAmount = parseFloat(amount)
    if (isNaN(stakeAmount) || stakeAmount <= 0) {
      setError('Please enter a valid positive number')
      return
    }
    setStakedAmount(prev => prev + stakeAmount)
    setAmount('')
    setError('')
  }

  const handleUnstake = () => {
    const unstakeAmount = parseFloat(amount)
    if (isNaN(unstakeAmount) || unstakeAmount <= 0) {
      setError('Please enter a valid positive number')
      return
    }
    if (unstakeAmount > stakedAmount) {
      setError('Unstake amount cannot exceed staked amount')
      return
    }
    setStakedAmount(prev => prev - unstakeAmount)
    setAmount('')
    setError('')
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Crypto Staking</CardTitle>
        <CardDescription>Stake or unstake your crypto</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Currently Staked:</span>
            <span className="text-lg font-bold">{stakedAmount.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={handleStake}>Stake</Button>
        <Button onClick={handleUnstake} variant="outline">Unstake</Button>
      </CardFooter>
    </Card>
  )
}