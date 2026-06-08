const hidden = { position: 'absolute', top: '-9999px', left: '-9999px' }

export default function AutofillBlocker() {
  return (
    <>
      <input style={hidden} type="text" name="fakeusername" tabIndex="-1" aria-hidden="true" />
      <input style={hidden} type="password" name="fakepassword" tabIndex="-1" aria-hidden="true" />
    </>
  )
}
