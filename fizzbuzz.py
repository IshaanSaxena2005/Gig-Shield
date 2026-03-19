for i in range(1,16):
    if i%3==0:
        print(f"{i} is buzz") 
    elif i%5==0:
        print(f"{i} is fizz")
    elif i%3==0 and i%5==0:
        print(f"{i} is fizzbuzz")
    else:
        print(f"{i} neither fizz nor buzz")

    
