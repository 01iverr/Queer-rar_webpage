from iso3166 import countries
with open ('writeme.txt', 'w',encoding="utf-8") as file:
    for c in countries:
        file.write('<option value=\"')
        file.write(str(c[0]))
        file.write('\">')
        file.write('\n')
