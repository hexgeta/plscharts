import { TableDemo } from '../components/Table'
import { SummaryTable } from '../components/Table2'
import { MaxiStaking } from '../components/Staking'

function NewTable() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Table Page</h1>
      <SummaryTable />
      <MaxiStaking />
    </div>
  )
}

export default NewTable;