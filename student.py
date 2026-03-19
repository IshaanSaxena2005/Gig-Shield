name= input("Enter your name: ")
age= int(input("Enter your age: ")) 
marks = []
for i in range(5):
    m=int(input(f"Enter marks for student subject {i+1}: "))
    marks.append(m)
total= sum(marks)
avg=(total/len(marks))/10
if avg>=9:
    grade="O"
elif avg>=8:
    grade="A+"
elif avg>=7:
    grade="A"
elif avg>=6:
    grade="B+"
elif avg>=5:
    grade="B"
else:
    grade="C"
print("Name: ",name)
print("Age: ",age)
print("Total Marks: ",total)
print("Average Marks: ",avg*10)
print("Grade: ",grade)
