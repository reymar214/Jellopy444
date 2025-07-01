# Read the input Lua table from a file
with open("iteminfo.txt", "r") as file:
    lua_table = file.read()

# Remove the unidentifiedUFO field and its content
import re
lua_table = re.sub(r'unidentifiedUFO = {[^}]*},\n', '', lua_table)

# Write the modified Lua table back to the file
with open("iteminfo2.txt", "w") as file:
    file.write(lua_table)