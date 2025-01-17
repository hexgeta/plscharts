import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function SummaryTable() {
  return (
    <div className="container mx-auto p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px text-white">Top stats</TableHead>
            <TableHead className="text-white">pMAXI Ⓜ️</TableHead>
            <TableHead className="text-white">pDECI 🛡️</TableHead>
            <TableHead className="text-white">pLUCKY 🍀</TableHead>
            <TableHead className="text-white">pTRIO 🎲</TableHead>
            <TableHead className="text-white">pBASE2 🟠</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Stake length in yrs</TableCell>
            <TableCell>15</TableCell>
            <TableCell>10</TableCell>
            <TableCell>7</TableCell>
            <TableCell>3</TableCell>
            <TableCell>1</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Progress %</TableCell>
            <TableCell>16%</TableCell>
            <TableCell>20%</TableCell>
            <TableCell>28%</TableCell>
            <TableCell>65%</TableCell>
            <TableCell>95%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Token price $</TableCell>
            <TableCell>$0.0114</TableCell>
            <TableCell>$0.0093</TableCell>
            <TableCell>$0.0099</TableCell>
            <TableCell>$0.0110</TableCell>
            <TableCell>$0.0112</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">T-share price $</TableCell>
            <TableCell>$74</TableCell>
            <TableCell>$74</TableCell>
            <TableCell>$98</TableCell>
            <TableCell>$164</TableCell>
            <TableCell>$240</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium"># tokens for 1 t-share / HEX for 1 t-share (mint)</TableCell>
            <TableCell>6,521</TableCell>
            <TableCell>7,934</TableCell>
            <TableCell>9,965</TableCell>
            <TableCell>14,818</TableCell>
            <TableCell>21,446</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium"># HEX for 1 t-share (today)</TableCell>
            <TableCell>8,012</TableCell>
            <TableCell>7,998</TableCell>
            <TableCell>10,589</TableCell>
            <TableCell>17,647</TableCell>
            <TableCell>25,865</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Discount/Premium (mint)</TableCell>
            <TableCell className="bg-green-100">22.87%</TableCell>
            <TableCell className="bg-green-100">0.81%</TableCell>
            <TableCell className="bg-green-100">6.26%</TableCell>
            <TableCell className="bg-green-100">19.09%</TableCell>
            <TableCell className="bg-green-100">7.38%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Discount/Premium (stake backing)</TableCell>
            <TableCell className="bg-red-100">-33.64%</TableCell>
            <TableCell className="bg-red-100">-37.96%</TableCell>
            <TableCell className="bg-red-100">-29.04%</TableCell>
            <TableCell className="bg-red-100">-10.76%</TableCell>
            <TableCell className="bg-red-100">-2.27%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}