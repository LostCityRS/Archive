We don't need to support anything other than RS2 off the bat, maybe consider RSC too, but we also don't want to design ourselves into a hole if we want to do more later

cache
```
id: number - internal identifier, because a revision might have multiple subrevisions, and each game can have overlapping build numbers
game: string - rs2/rsc/osrs?/rs3?/misc. funorb?/mapview?
build: string - revision
timestamp: datetime | null
newspost: string | null
js5: boolean - read from cache_js5/data_js5 table
ondemand: boolean - read from cache_ondemand/data_ondemand table
jag: boolean - read from cache_jag/data_jag table
```

submission - user submitted cache for review, stored on filesystem?
```
uuid: string
attribution: string | null
ip: string
user_agent: string
```

# 2006+

data_js5 - files identified by archive/group
```
game: string
archive: number
group: number
version: number
crc: number
bytes: Uint8Array
len: number
```

cache_js5
```
cache_id: number
archive: number
group: number
version: number
crc: number
```

# 2004-2006

data_ondemand - files identified by archive/file
```
game: string
archive: number
file: number
version: number
crc: number
bytes: Uint8Array
len: number
```

cache_ondemand - link cache to data_ondemand
```
cache_id: number
archive: number
file: number
version: number
crc: number
essential: boolean - in this era we're able to differentiate unused/used models
```

# 2001-2004

data_jag - files identified by name
```
game: string
name: string
crc: number
bytes: Uint8Array
len: number
```

cache_jag - link cache to data_jag
```
cache_id: number
name: string
crc: number
```
