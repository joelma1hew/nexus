export default function Job({job}) {
  return (
    <div>
    <h3>{job.title}</h3>
    <p>Location: {job.location}</p>
    <p>Salary: {job.salary}</p>
    <p>Job Type: {job.job_type}</p>
    <a href={job.source_url}>View Details</a>
    </div>
  )
}
