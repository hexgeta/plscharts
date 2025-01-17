import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"

  import { supabase } from '../supabaseClient';
  import React, { useEffect, useState, useCallback } from 'react';
  
  export function TableDemo() {
    const [discountData, setDiscountData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
  
    const fetchDiscountData = useCallback(async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('pMAXI - DiscountChart')
          .select('Day, "Backing Value", "Discount/Premium"')
        
        if (error) throw error
        
        setDiscountData(data)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }, [])
  
    useEffect(() => {
      fetchDiscountData()
    }, [fetchDiscountData])
  
    if (loading) return <div>Loading...</div>
    if (error) return <div>Error: {error}</div>
  
    return (
      <Table>
        <TableCaption>pMAXI - Discount Chart</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Backing Value</TableHead>
            <TableHead>Discount/Premium</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discountData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.Day}</TableCell>
              <TableCell>{row['Backing Value']}</TableCell>
              <TableCell>{row['Discount/Premium']}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }