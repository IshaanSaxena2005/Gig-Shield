name= input("Enter your name: ")
money={}
total_expense=0
n=int(input("Enter number of expense items: "))
for i in range (n):
    item=input(f"Enter the name of expense item {i+1}: ")
    cost = float(input(f"Enter the cost of {item}: "))
    money[item]=cost
    total_expense+=cost
print("Name: ",name)
print("Total Expense: ",total_expense)
print("Expense Details:")
for item, cost in money.items():
    print(f"{item}: {cost}")  
print("Thank you for using the expense tracker!")



