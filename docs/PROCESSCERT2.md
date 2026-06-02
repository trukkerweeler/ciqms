# PROCESS CERTIFICATE (processcert)

## Mental Model
1) Get the transactions for the parent (j52)
2) User picks the parent
3) Iterate the chosen parent and its heirarchy to get all the unique WO's when their 'j52' dates completed before parent inventory rtransaction.
4) query each of those borne children for their operations
5) (How to know which parts may have been entirelyconsumed already and dont need to go on the cert?)

When the user selects a parent J52, recursively follow SERIAL_NUMBER references to find all contributing child jobs, but only include child J52 transactions whose DATE_HISTORY + TIME_ITEM_HISTORY occur before the selected parent J52.
